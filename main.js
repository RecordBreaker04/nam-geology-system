// Global variables
let map;
let currentBaseMap = 'osm';
let locationCircle = null;
let selectionLayer = null;
let searchMarker = null;
let searchMarkerCircle = null;
let mineralsVectorLayer = null;
let sidebarCollapsed = false;
let measureControl = null;
let isMeasureActive = false;
let isDrawActive = false;
let isSelectByPolygonActive = false;
let isSelectByPointActive = false;

// WMS Layer Configuration
const wmsUrl = "http://localhost:8080/geoserver/mme/wms";
const wfsUrl = "http://localhost:8080/geoserver/mme/wfs";

// Namibia bounds
const namibiaBounds = L.latLngBounds(
    L.latLng(-28.965186, 11.747095), // SW corner
    L.latLng(-16.956243, 25.264435)  // NE corner
);

// Base maps
const baseMaps = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    })
};

// Define all WMS layers from GeoServer
const wmsLayers = {
    geology: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:geology_1m',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    minerals: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:minerals',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    roads: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:roads',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    districts: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:districts',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    towns_villages: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:towns_villages',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    regions: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:regions',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    }),
    country: L.tileLayer.wms(wmsUrl, {
        layers: 'mme:country',
        format: 'image/png',
        transparent: true,
        attribution: "Geological Survey of Namibia"
    })
};

// Layer control tracking
const layers = {
    geology: null,
    minerals: null,
    roads: null,
    districts: null,
    towns_villages: null,
    regions: null,
    country: null
};

// Initialize the draw control
const drawnItems = new L.FeatureGroup();
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems,
        edit: false
    },
    draw: {
        polygon: {
            shapeOptions: {
                color: '#e74c3c',
                fillColor: '#e74c3c',
                fillOpacity: 0.2
            },
            allowIntersection: false,
            showArea: true
        },
        polyline: {
            shapeOptions: {
                color: '#0056b3',
                weight: 4
            }
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
    }
});

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeWelcomeModal();
    initializeRockIdentifier();
    initializeSearchToggle();
    initializeBasemapToggle();
    initializeLegendToggle();
    initializeSidebar();
    initializeTabs();
    initializeLayerControls();
    initializeMapControls();
    initializeSearchFunctionality();
    initializeModals();
    initializeToolButtons();
});

// ===== MAP INITIALIZATION =====
function initializeMap() {
    map = L.map('map', {
        maxBounds: namibiaBounds,
        maxBoundsViscosity: 1.0
    }).fitBounds(namibiaBounds);
    
    // Add default base map
    baseMaps.osm.addTo(map);
    
    // Add drawn items to map
    map.addLayer(drawnItems);
    
    // Show current coordinates on map
    const coordinatesMarker = document.getElementById('coordinatesMarker');
    map.on('mousemove', (e) => {
        coordinatesMarker.textContent = `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`;
    });
    
    // Handle draw events
    map.on(L.Draw.Event.CREATED, function (e) {
        const type = e.layerType;
        const layer = e.layer;
        
        // Add the layer to the feature group
        drawnItems.addLayer(layer);
        
        // Calculate and show measurements
        if (type === 'polygon') {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            const areaKm = area / 1000000; // Convert to km²
            document.getElementById('measurementResult').textContent = `Area: ${areaKm.toFixed(2)} km²`;
            document.getElementById('measurementResult').style.display = 'block';
            
            // If selection by polygon is active, perform selection
            if (isSelectByPolygonActive) {
                performSelectionByPolygon(layer);
            }
        } else if (type === 'polyline') {
            const length = layer.getLatLngs().reduce((total, latLng, index, array) => {
                if (index > 0) {
                    return total + latLng.distanceTo(array[index - 1]);
                }
                return total;
            }, 0);
            const lengthKm = length / 1000; // Convert to km
            document.getElementById('measurementResult').textContent = `Distance: ${lengthKm.toFixed(2)} km`;
            document.getElementById('measurementResult').style.display = 'block';
        }
    });
}

// ===== WELCOME MODAL =====
function initializeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
    
    document.getElementById('welcomeCloseButton').addEventListener('click', function() {
        document.getElementById('welcomeModal').style.display = 'none';
    });
}

// ===== SIDEBAR FUNCTIONALITY =====
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    
    sidebarToggle.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        sidebar.classList.toggle('collapsed');
        sidebarToggle.classList.toggle('collapsed');
        sidebarToggle.querySelector('i').classList.toggle('fa-chevron-left');
        sidebarToggle.querySelector('i').classList.toggle('fa-chevron-right');
    });
    
    mobileMenuButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ===== TAB FUNCTIONALITY =====
function initializeTabs() {
    // Main tab switching
    document.querySelectorAll('.tab-bar button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and tabs
            document.querySelectorAll('.tab-bar button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Search tab switching
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.search-panel').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-search`).classList.add('active');
        });
    });
}

// ===== LAYER CONTROLS =====
function initializeLayerControls() {
    // Layer control functionality
    document.querySelectorAll('.layer-control input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const layerId = e.target.getAttribute('data-layer');
            
            // Check if WMS layer needs to be loaded
            if (!layers[layerId] && wmsLayers[layerId]) {
                showLoading();
                
                // Initialize the WMS layer
                layers[layerId] = wmsLayers[layerId];
                
                if (e.target.checked) {
                    map.addLayer(layers[layerId]);
                    
                    // Special handling for minerals layer - add vector layer for popups
                    if (layerId === 'minerals') {
                        loadMineralsVectorLayer();
                        document.getElementById('geologyType').style.display = 'block';
                    }
                    
                    // Show geology type dropdown when geology is selected
                    if (layerId === 'geology') {
                        document.getElementById('geologyType').style.display = 'block';
                    }
                } else {
                    map.removeLayer(layers[layerId]);
                    
                    // Remove minerals vector layer if minerals is deselected
                    if (layerId === 'minerals' && mineralsVectorLayer) {
                        map.removeLayer(mineralsVectorLayer);
                        mineralsVectorLayer = null;
                    }
                    
                    // Hide geology type dropdown when geology is deselected
                    if (layerId === 'geology') {
                        document.getElementById('geologyType').style.display = 'none';
                    }
                }
                
                updateLegend();
                hideLoading();
            } else {
                // Toggle existing layer
                if (e.target.checked) {
                    map.addLayer(layers[layerId]);
                    
                    // Special handling for minerals layer - add vector layer for popups
                    if (layerId === 'minerals' && !mineralsVectorLayer) {
                        loadMineralsVectorLayer();
                    }
                    
                    // Show geology type dropdown when geology is selected
                    if (layerId === 'geology') {
                        document.getElementById('geologyType').style.display = 'block';
                    }
                    
                    updateLegend();
                } else {
                    map.removeLayer(layers[layerId]);
                    
                    // Remove minerals vector layer if minerals is deselected
                    if (layerId === 'minerals' && mineralsVectorLayer) {
                        map.removeLayer(mineralsVectorLayer);
                        mineralsVectorLayer = null;
                    }
                    
                    // Hide geology type dropdown when geology is deselected
                    if (layerId === 'geology') {
                        document.getElementById('geologyType').style.display = 'none';
                    }
                    
                    updateLegend();
                }
            }
        });
    });

    // Geology type selection
    document.getElementById('geologyType').addEventListener('change', (e) => {
        updateLegend();
    });

    // Download functionality
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const layer = this.getAttribute('data-layer');
            const formatSelect = document.querySelector(`.format-select[data-layer="${layer}"]`);
            const format = formatSelect.value;
            
            downloadLayerData(layer, format);
        });
    });
}

// ===== MAP CONTROLS =====
function initializeMapControls() {
    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => {
        map.zoomIn();
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        map.zoomOut();
    });
    
    document.getElementById('fullExtent').addEventListener('click', () => {
        map.fitBounds(namibiaBounds);
    });
    
    // Find my location functionality
    document.getElementById('findLocation').addEventListener('click', findMyLocation);
    
    // Base map switching
    document.querySelectorAll('.basemap-option').forEach(option => {
        option.addEventListener('click', () => {
            const basemap = option.getAttribute('data-basemap');
            
            // Update UI
            document.querySelectorAll('.basemap-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // Switch base map
            if (basemap !== currentBaseMap) {
                map.removeLayer(baseMaps[currentBaseMap]);
                baseMaps[basemap].addTo(map);
                currentBaseMap = basemap;
            }
            
            // Hide basemap selector after selection
            document.getElementById('basemapContent').style.display = 'none';
        });
    });
}

// ===== SEARCH FUNCTIONALITY =====
function initializeSearchFunctionality() {
    // Place search
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchButton = document.getElementById('searchButton');
    
    searchButton.addEventListener('click', searchPlaces);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchPlaces();
        }
    });
    
    // Coordinate search
    document.getElementById('goToCoordinates').addEventListener('click', goToCoordinates);
}

// ===== MODAL FUNCTIONALITY =====
function initializeModals() {
    // Login modal
    const loginButton = document.getElementById('loginButton');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    
    loginButton.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    // Register modal
    const registerButton = document.getElementById('registerButton');
    const registerModal = document.getElementById('registerModal');
    const registerForm = document.getElementById('registerForm');
    
    registerButton.addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
    
    // Contact modal
    const contactButton = document.getElementById('contactButton');
    const contactModal = document.getElementById('contactModal');
    const closeModal = document.querySelectorAll('.close-modal');
    const contactForm = document.getElementById('contactForm');
    
    contactButton.addEventListener('click', () => {
        contactModal.style.display = 'flex';
    });
    
    // Role selection in forms
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Form submissions
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('.role-btn.active').getAttribute('data-role');
        
        // Here you would typically authenticate with a server
        console.log('Login attempt:', { username, password, role });
        
        // For demonstration, just show a success message
        alert(`Logged in as ${username} (${role})`);
        loginModal.style.display = 'none';
        loginForm.reset();
    });
    
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.querySelector('.role-btn.active').getAttribute('data-role');
        
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        
        // Here you would typically register with a server
        console.log('Registration attempt:', { username, email, password, role });
        
        // For demonstration, just show a success message
        alert(`Registration successful for ${username} (${role})`);
        registerModal.style.display = 'none';
        registerForm.reset();
    });
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Here you would typically send the form data to a server
        const formData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value
        };
        
        console.log('Form submitted:', formData); // For demonstration
        
        // Show success message
        alert('Thank you for your message. We will contact you soon.');
        
        // Reset form and close modal
        contactForm.reset();
        contactModal.style.display = 'none';
    });
    
    // Close modal functionality for all modals
    closeModal.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Help functionality
    document.getElementById('helpButton').addEventListener('click', () => {
        alert(`Help:\n\n1. Map Viewer - Explore geological data\n` +
              `2. Toggle layers on/off in the sidebar\n` +
              `3. Search for places or enter coordinates to navigate\n` +
              `4. View metadata in the Metadata tab\n\n` +
              `For further assistance, contact the Geological Survey of Namibia.`);
    });
}

// ===== TOOL BUTTONS =====
function initializeToolButtons() {
    // Measure tool
    document.getElementById('measureTool').addEventListener('click', function() {
        if (isMeasureActive) {
            deactivateAllTools();
        } else {
            deactivateAllTools();
            
            // Initialize measure control properly
            measureControl = new L.Control.Measure({
                position: 'topleft',
                primaryLengthUnit: 'kilometers',
                secondaryLengthUnit: 'meters',
                primaryAreaUnit: 'sqkilometers',
                secondaryAreaUnit: 'sqmeters',
                activeColor: '#e74c3c',
                completedColor: '#2d1462',
                captureZIndex: 1000
            });
            
            measureControl.addTo(map);
            isMeasureActive = true;
            this.classList.add('active');
            document.getElementById('activateMeasure').classList.add('active');
            
            // Show measurement result container
            document.getElementById('measurementResult').style.display = 'block';
            
            // Listen for measurement events
            map.on('measurefinish', (e) => {
                let resultText = '';
                if (e.area != null) {
                    resultText = `Area: ${e.area.toFixed(2)} ${e.unit}`;
                } else if (e.length != null) {
                    resultText = `Distance: ${e.length.toFixed(2)} ${e.unit}`;
                }
                document.getElementById('measurementResult').textContent = resultText;
            });
            
            map.on('measurestart', () => {
                document.getElementById('measurementResult').textContent = 'Measuring...';
            });
        }
    });

    // Drawing tools
    document.getElementById('drawPolygon').addEventListener('click', function() {
        if (isDrawActive) {
            deactivateAllTools();
        } else {
            deactivateAllTools();
            drawControl.options.draw.polygon = true;
            drawControl.options.draw.polyline = false;
            drawControl.addTo(map);
            isDrawActive = true;
            this.classList.add('active');
            document.getElementById('activateDrawing').classList.add('active');
        }
    });

    document.getElementById('drawPolyline').addEventListener('click', function() {
        if (isDrawActive) {
            deactivateAllTools();
        } else {
            deactivateAllTools();
            drawControl.options.draw.polygon = false;
            drawControl.options.draw.polyline = true;
            drawControl.addTo(map);
            isDrawActive = true;
            this.classList.add('active');
            document.getElementById('activateDrawing').classList.add('active');
        }
    });

    // Clear map
    document.getElementById('clearMap').addEventListener('click', function() {
        // Clear all drawings
        drawnItems.clearLayers();
        
        // Clear measurements
        document.getElementById('measurementResult').style.display = 'none';
        
        // Clear selection
        if (selectionLayer) {
            map.removeLayer(selectionLayer);
            selectionLayer = null;
        }
        document.getElementById('selectionInfo').style.display = 'none';
        document.getElementById('selectionContent').innerHTML = '';
        
        // Clear search markers
        clearSearchMarker();
        
        // Clear location marker
        if (locationCircle) {
            map.removeLayer(locationCircle);
            locationCircle = null;
        }
        
        // Deactivate all tools
        deactivateAllTools();
        
        // Show confirmation
        alert("Map has been cleared of all drawings, measurements, and markers.");
    });

    // Selection tools
    document.getElementById('selectByPolygon').addEventListener('click', function() {
        if (isSelectByPolygonActive) {
            deactivateAllTools();
        } else {
            deactivateAllTools();
            isSelectByPolygonActive = true;
            this.classList.add('active');
            document.getElementById('activateSelectPolygon').classList.add('active');
            
            // Configure draw control for selection
            drawControl.options.draw.polygon = true;
            drawControl.options.draw.polyline = false;
            drawControl.addTo(map);
            isDrawActive = true;
        }
    });
    
    document.getElementById('selectByPoint').addEventListener('click', function() {
        if (isSelectByPointActive) {
            deactivateAllTools();
        } else {
            deactivateAllTools();
            isSelectByPointActive = true;
            this.classList.add('active');
            document.getElementById('activateSelectPoint').classList.add('active');
            
            // Set up click handler for point selection
            map.on('click', handlePointSelection);
        }
    });

    // Clear selection button
    document.getElementById('clearSelection').addEventListener('click', function() {
        if (selectionLayer) {
            map.removeLayer(selectionLayer);
            selectionLayer = null;
        }
        document.getElementById('selectionInfo').style.display = 'none';
        document.getElementById('selectionContent').innerHTML = '';
        document.getElementById('attributeModal').style.display = 'none';
    });

    // Tool buttons in tools tab
    document.getElementById('activateMeasure').addEventListener('click', function() {
        document.querySelector('[data-tab="map"]').click();
        setTimeout(() => {
            document.getElementById('measureTool').click();
        }, 100);
    });
    
    document.getElementById('activateDrawing').addEventListener('click', function() {
        document.querySelector('[data-tab="map"]').click();
        setTimeout(() => {
            document.getElementById('drawPolygon').click();
        }, 100);
    });
    
    document.getElementById('activateSelectPolygon').addEventListener('click', function() {
        document.querySelector('[data-tab="map"]').click();
        setTimeout(() => {
            document.getElementById('selectByPolygon').click();
        }, 100);
    });
    
    document.getElementById('activateSelectPoint').addEventListener('click', function() {
        document.querySelector('[data-tab="map"]').click();
        setTimeout(() => {
            document.getElementById('selectByPoint').click();
        }, 100);
    });
    
    document.getElementById('activateAnalysis').addEventListener('click', () => {
        alert('Layer analysis tool would open here');
    });
    
    document.getElementById('activateStatistics').addEventListener('click', () => {
        alert('Statistics tool would open here');
    });
    
    document.getElementById('activateExport').addEventListener('click', () => {
        alert('Export tool would open here');
    });
    
    document.getElementById('activateSearch').addEventListener('click', () => {
        alert('Advanced search tool would open here');
    });
    
    // AI Assistant functionality
    document.getElementById('aiAssistant').addEventListener('click', openAIAssistant);
    document.getElementById('activateAI').addEventListener('click', openAIAssistant);
    
    // Rock Identifier
    document.getElementById('activateRockIdentifier').addEventListener('click', function() {
        document.querySelector('[data-tab="rock-identifier"]').click();
    });
}

// ===== UI TOGGLE FUNCTIONS =====
function initializeSearchToggle() {
    const searchToggle = document.getElementById('searchToggle');
    const searchContent = document.getElementById('searchContent');
    
    searchToggle.addEventListener('click', function() {
        searchContent.style.display = searchContent.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close search when clicking outside
    document.addEventListener('click', function(event) {
        const searchBox = document.getElementById('searchBox');
        if (!searchBox.contains(event.target)) {
            searchContent.style.display = 'none';
        }
    });
}

function initializeBasemapToggle() {
    const basemapToggle = document.getElementById('basemapToggle');
    const basemapContent = document.getElementById('basemapContent');
    
    basemapToggle.addEventListener('click', function() {
        basemapContent.style.display = basemapContent.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close basemap when clicking outside
    document.addEventListener('click', function(event) {
        const basemapSelector = document.getElementById('basemapSelector');
        if (!basemapSelector.contains(event.target)) {
            basemapContent.style.display = 'none';
        }
    });
}

function initializeLegendToggle() {
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');
    
    legendToggle.addEventListener('click', function() {
        legendContent.style.display = legendContent.style.display === 'none' ? 'block' : 'none';
        legendToggle.querySelector('i').classList.toggle('fa-chevron-down');
        legendToggle.querySelector('i').classList.toggle('fa-chevron-up');
    });
}

// ===== MINERALS LAYER FUNCTIONALITY =====
function loadMineralsVectorLayer() {
    showLoading();
    
    // Create WFS request URL for minerals data
    const wfsRequest = `${wfsUrl}?` +
        `service=WFS&` +
        `version=1.0.0&` +
        `request=GetFeature&` +
        `typeName=mme:minerals&` +
        `outputFormat=application/json`;
    
    fetch(wfsRequest)
        .then(response => response.json())
        .then(data => {
            mineralsVectorLayer = L.geoJSON(data, {
                pointToLayer: function(feature, latlng) {
                    // Create custom markers for different mineral types
                    let markerColor = '#000000'; // Default black
                    let markerIcon = 'circle';
                    
                    // Determine marker style based on mineral type
                    if (feature.properties && feature.properties.MINERAL_TYPE) {
                        const mineralType = feature.properties.MINERAL_TYPE.toLowerCase();
                        if (mineralType.includes('gold') || mineralType.includes('precious')) {
                            markerColor = '#ffd700'; // Gold
                            markerIcon = 'star';
                        } else if (mineralType.includes('copper') || mineralType.includes('base')) {
                            markerColor = '#ff9900'; // Orange
                            markerIcon = 'square';
                        } else if (mineralType.includes('diamond') || mineralType.includes('gem')) {
                            markerColor = '#00ffff'; // Cyan
                            markerIcon = 'diamond';
                        } else if (mineralType.includes('uranium') || mineralType.includes('nuclear')) {
                            markerColor = '#00ff00'; // Green
                            markerIcon = 'hexagon';
                        }
                    }
                    
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            className: `mineral-marker ${markerIcon}`,
                            html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: ${markerIcon === 'circle' ? '50%' : '0'}; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
                            iconSize: [12, 12]
                        })
                    });
                },
                onEachFeature: function(feature, layer) {
                    // Create popup content with mineral information
                    if (feature.properties) {
                        const props = feature.properties;
                        let popupContent = '<div class="mineral-popup">';
                        popupContent += '<h4>Mineral Occurrence</h4>';
                        popupContent += '<table class="mineral-table">';
                        
                        // Add properties to popup
                        if (props.MINERAL_TYPE) popupContent += `<tr><td><strong>Mineral Type:</strong></td><td>${props.MINERAL_TYPE}</td></tr>`;
                        if (props.DEPOSIT_TYPE) popupContent += `<tr><td><strong>Deposit Type:</strong></td><td>${props.DEPOSIT_TYPE}</td></tr>`;
                        if (props.COMMODITY) popupContent += `<tr><td><strong>Commodity:</strong></td><td>${props.COMMODITY}</td></tr>`;
                        if (props.STATUS) popupContent += `<tr><td><strong>Status:</strong></td><td>${props.STATUS}</td></tr>`;
                        if (props.REGION) popupContent += `<tr><td><strong>Region:</strong></td><td>${props.REGION}</td></tr>`;
                        if (props.DISTRICT) popupContent += `<tr><td><strong>District:</strong></td><td>${props.DISTRICT}</td></tr>`;
                        if (props.LOCATION) popupContent += `<tr><td><strong>Location:</strong></td><td>${props.LOCATION}</td></tr>`;
                        if (props.COMMENTS) popupContent += `<tr><td><strong>Comments:</strong></td><td>${props.COMMENTS}</td></tr>`;
                        
                        popupContent += '</table>';
                        popupContent += '</div>';
                        
                        layer.bindPopup(popupContent);
                    }
                }
            }).addTo(map);
            
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading minerals data:', error);
            hideLoading();
            alert('Error loading mineral occurrences data. Please check if GeoServer is running.');
        });
}

// ===== DOWNLOAD FUNCTIONALITY =====
function downloadLayerData(layerName, format) {
    showLoading();
    
    // Map format to output format for WFS
    const formatMap = {
        'shp': 'shape-zip',
        'gml': 'GML2',
        'csv': 'csv',
        'geojson': 'application/json'
    };
    
    // Map layer names to GeoServer layer names
    const layerMap = {
        'minerals': 'mme:minerals',
        'geology': 'mme:geology_1m',
        'roads': 'mme:roads',
        'districts': 'mme:districts',
        'towns_villages': 'mme:towns_villages',
        'regions': 'mme:regions',
        'country': 'mme:country'
    };
    
    const geoserverLayer = layerMap[layerName];
    const outputFormat = formatMap[format];
    
    if (!geoserverLayer || !outputFormat) {
        alert('Download configuration error');
        hideLoading();
        return;
    }
    
    // Construct WFS request URL
    const wfsRequest = `${wfsUrl}?` +
        `service=WFS&` +
        `version=1.0.0&` +
        `request=GetFeature&` +
        `typeName=${geoserverLayer}&` +
        `outputFormat=${outputFormat}`;
    
    // For GML and GeoJSON, we need to handle the download differently
    if (format === 'gml' || format === 'geojson') {
        fetch(wfsRequest)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${layerName}_data.${getFileExtension(format)}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                hideLoading();
                alert(`Downloading ${layerName} data in ${format.toUpperCase()} format`);
            })
            .catch(error => {
                console.error('Download error:', error);
                hideLoading();
                alert('Download failed. Please try again.');
            });
    } else {
        // For SHP and CSV, use the direct link method
        const link = document.createElement('a');
        link.href = wfsRequest;
        link.download = `${layerName}_data.${getFileExtension(format)}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        hideLoading();
        alert(`Downloading ${layerName} data in ${format.toUpperCase()} format`);
    }
}

function getFileExtension(format) {
    const extensions = {
        'shp': 'zip',
        'gml': 'gml',
        'csv': 'csv',
        'geojson': 'geojson'
    };
    return extensions[format] || 'zip';
}

// ===== LOCATION FUNCTIONALITY =====
function findMyLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Check if location is within Namibia
            if (lat >= -28.965186 && lat <= -16.956243 && lng >= 11.747095 && lng <= 25.264435) {
                // Remove existing location circle
                if (locationCircle) {
                    map.removeLayer(locationCircle);
                }
                
                // Add circle with 100m accuracy
                locationCircle = L.circle([lat, lng], {
                    color: 'blue',
                    fillColor: '#30a5ff',
                    fillOpacity: 0.2,
                    radius: Math.max(accuracy, 100) // Minimum 100m radius
                }).addTo(map);
                
                // Zoom to location
                map.setView([lat, lng], 15);
                
                // Add marker
                L.marker([lat, lng]).addTo(map)
                    .bindPopup("Your location (Accuracy: " + Math.round(accuracy) + "m)")
                    .openPopup();
            } else {
                alert("Your location is outside Namibia. The app is focused on Namibia only.");
            }
            
            hideLoading();
        },
        function(error) {
            hideLoading();
            alert("Error getting your location: " + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// ===== SEARCH FUNCTIONALITY =====
function searchPlaces() {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        alert("Please enter a place name to search");
        searchResults.style.display = 'none';
        return;
    }

    showLoading();
    
    // Clear previous results
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    
    // Search within Namibia bounds
    const viewbox = '11.747095,-28.965186,25.264435,-16.956243';
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&countrycodes=na&limit=10`)
        .then(res => res.json())
        .then(data => {
            hideLoading();
            displaySearchResults(data);
        })
        .catch(err => {
            hideLoading();
            console.error('Search error:', err);
            // Fallback to local search if API fails
            fallbackLocalSearch(query);
        });
}

function fallbackLocalSearch(query) {
    // List of major places in Namibia as fallback
    const namibiaPlaces = [
        { display_name: "Windhoek, Namibia", lat: -22.5609, lon: 17.0658, type: "capital" },
        { display_name: "Swakopmund, Namibia", lat: -22.6708, lon: 14.5686, type: "city" },
        { display_name: "Walvis Bay, Namibia", lat: -22.9576, lon: 14.5053, type: "city" },
        { display_name: "Rundu, Namibia", lat: -17.9333, lon: 19.7667, type: "city" },
        { display_name: "Oshakati, Namibia", lat: -17.7833, lon: 15.6833, type: "town" },
        { display_name: "Katima Mulilo, Namibia", lat: -17.5000, lon: 24.2667, type: "town" },
        { display_name: "Etosha National Park, Namibia", lat: -18.9667, lon: 15.9000, type: "park" },
        { display_name: "Sossusvlei, Namibia", lat: -24.7333, lon: 15.3667, type: "attraction" },
        { display_name: "Fish River Canyon, Namibia", lat: -27.5833, lon: 17.5833, type: "attraction" },
        { display_name: "Lüderitz, Namibia", lat: -26.6478, lon: 15.1539, type: "town" },
        { display_name: "Tsumeb, Namibia", lat: -19.2500, lon: 17.7167, type: "town" },
        { display_name: "Grootfontein, Namibia", lat: -19.5667, lon: 18.1167, type: "town" },
        { display_name: "Keetmanshoop, Namibia", lat: -26.5769, lon: 18.1456, type: "town" },
        { display_name: "Otjiwarongo, Namibia", lat: -20.4639, lon: 16.6478, type: "town" },
        { display_name: "Okahandja, Namibia", lat: -21.9833, lon: 16.9167, type: "town" },
        { display_name: "Rehoboth, Namibia", lat: -23.3167, lon: 17.0833, type: "town" },
        { display_name: "Gobabis, Namibia", lat: -22.4500, lon: 18.9667, type: "town" },
        { display_name: "Mariental, Namibia", lat: -24.6333, lon: 17.9667, type: "town" },
        { display_name: "Opuwo, Namibia", lat: -18.0500, lon: 13.8333, type: "town" },
        { display_name: "Outjo, Namibia", lat: -20.1167, lon: 16.1500, type: "town" }
    ];
    
    const results = namibiaPlaces.filter(place => 
        place.display_name.toLowerCase().includes(query.toLowerCase())
    );
    
    displaySearchResults(results);
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    
    if (results.length > 0) {
        results.forEach((place, index) => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `<strong>${place.display_name}</strong>`;
            
            // Add click handler to zoom to the location
            item.addEventListener('click', () => {
                document.getElementById('searchInput').value = place.display_name;
                searchResults.style.display = 'none';
                
                // Zoom to the location
                map.setView([place.lat, place.lon], 12);
                
                // Add a marker at the location
                clearSearchMarker();
                addSearchMarker(place);
            });
            
            searchResults.appendChild(item);
        });
        
        searchResults.style.display = 'block';
    } else {
        const noResults = document.createElement('div');
        noResults.className = 'search-result-item';
        noResults.textContent = 'No results found';
        searchResults.appendChild(noResults);
        searchResults.style.display = 'block';
    }
}

function addSearchMarker(place) {
    // Clear previous marker if exists
    clearSearchMarker();
    
    // Add marker with popup
    searchMarker = L.marker([place.lat, place.lon]).addTo(map);
    
    // Add a circle to highlight the location
    searchMarkerCircle = L.circle([place.lat, place.lon], {
        color: '#2d1462',
        fillColor: '#4a2a9e',
        fillOpacity: 0.2,
        radius: 5000,
        className: 'search-highlight-circle'
    }).addTo(map);
    
    // Create popup content
    const popupContent = `
        <div class="marker-popup">
            <h3>${place.display_name}</h3>
            <p class="coordinates">Latitude: ${place.lat.toFixed(6)}<br>Longitude: ${place.lon.toFixed(6)}</p>
            ${place.type ? `<p>Type: ${place.type}</p>` : ''}
        </div>
    `;
    
    // Bind popup to marker
    searchMarker.bindPopup(popupContent).openPopup();
    
    // Automatically remove the highlight circle after 5 seconds
    setTimeout(() => {
        if (searchMarkerCircle) {
            map.removeLayer(searchMarkerCircle);
            searchMarkerCircle = null;
        }
    }, 5000); // 5000 milliseconds = 5 seconds
}

function clearSearchMarker() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
    if (searchMarkerCircle) {
        map.removeLayer(searchMarkerCircle);
        searchMarkerCircle = null;
    }
}

function goToCoordinates() {
    const lat = parseFloat(document.getElementById('latitudeInput').value);
    const lng = parseFloat(document.getElementById('longitudeInput').value);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -28.965186 && lat <= -16.956243 && 
        lng >= 11.747095 && lng <= 25.264435) {
        map.setView([lat, lng], 12);
        
        // Add a marker at the coordinates
        clearSearchMarker();
        searchMarker = L.marker([lat, lng]).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div class="marker-popup">
                <h3>Custom Location</h3>
                <p class="coordinates">Latitude: ${lat.toFixed(6)}<br>Longitude: ${lng.toFixed(6)}</p>
            </div>
        `;
        
        // Bind popup to marker
        searchMarker.bindPopup(popupContent).openPopup();
    } else {
        alert('Please enter valid coordinates within Namibia:\nLatitude between -28.965186 and -16.956243\nLongitude between 11.747095 and 25.264435');
    }
}

// ===== SELECTION TOOLS =====
function handlePointSelection(e) {
    if (isSelectByPointActive) {
        performSelectionByPoint(e.latlng);
    }
}

async function performSelectionByPolygon(polygonLayer) {
    showLoading();
    
    try {
        // Get polygon bounds and coordinates
        const bounds = polygonLayer.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        
        // Create WFS request for features within bounds
        const wfsRequest = `${wfsUrl}?` +
            `service=WFS&` +
            `version=1.0.0&` +
            `request=GetFeature&` +
            `typeName=mme:geology_1m&` +
            `bbox=${bbox},EPSG:4326&` +
            `outputFormat=application/json`;
        
        const response = await fetch(wfsRequest);
        const data = await response.text();
        
        // Parse the response and display results
        const features = parseWFSResponse(data);
        displaySelectionResults(features, 'polygon', polygonLayer);
        
    } catch (error) {
        console.error('Error querying GeoServer:', error);
        alert('Error querying data from GeoServer. Please try again.');
    } finally {
        hideLoading();
    }
}

async function performSelectionByPoint(latlng) {
    showLoading();
    
    try {
        // Create a small buffer around the point for selection
        const bufferRadius = 0.01; // degrees (~1km)
        const bbox = `${latlng.lat - bufferRadius},${latlng.lng - bufferRadius},${latlng.lat + bufferRadius},${latlng.lng + bufferRadius}`;
        
        // Create WFS request for features within buffer
        const wfsRequest = `${wfsUrl}?` +
            `service=WFS&` +
            `version=1.0.0&` +
            `request=GetFeature&` +
            `typeName=mme:geology_1m&` +
            `bbox=${bbox},EPSG:4326&` +
            `outputFormat=application/json`;
        
        const response = await fetch(wfsRequest);
        const data = await response.text();
        
        // Parse the response and display results
        const features = parseWFSResponse(data);
        displaySelectionResults(features, 'point', latlng);
        
    } catch (error) {
        console.error('Error querying GeoServer:', error);
        alert('Error querying data from GeoServer. Please try again.');
    } finally {
        hideLoading();
    }
}

function parseWFSResponse(data) {
    try {
        // Check if the response is XML (error case)
        if (data.startsWith('<?xml') || data.startsWith('<')) {
            console.warn('Received XML response instead of JSON. This might be an error from GeoServer.');
            
            // Try to extract error message from XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            const errorElement = xmlDoc.getElementsByTagName('ServiceException')[0];
            
            if (errorElement) {
                const errorMsg = errorElement.textContent;
                console.error('GeoServer error:', errorMsg);
                alert(`GeoServer error: ${errorMsg}`);
            } else {
                console.error('Unexpected XML response from GeoServer');
                alert('Unexpected response format from GeoServer. Please check server configuration.');
            }
            
            return [];
        }
        
        // Try to parse as JSON
        const geojson = JSON.parse(data);
        return geojson.features || [];
    } catch (error) {
        console.error('Error parsing WFS response:', error, 'Response data:', data.substring(0, 200));
        return [];
    }
}

function displaySelectionResults(features, selectionType, geometry) {
    // Create selection layer if it doesn't exist
    if (!selectionLayer) {
        selectionLayer = L.layerGroup().addTo(map);
    } else {
        selectionLayer.clearLayers();
    }
    
    // Add selection geometry to map
    if (selectionType === 'polygon') {
        geometry.setStyle({
            color: '#ff9900',
            fillColor: '#ff9900',
            fillOpacity: 0.3,
            weight: 3
        });
        selectionLayer.addLayer(geometry);
    } else if (selectionType === 'point') {
        L.circle(geometry, {
            color: '#ff9900',
            fillColor: '#ff9900',
            fillOpacity: 0.2,
            radius: 500
        }).addTo(selectionLayer);
    }
    
    // Add feature markers
    features.forEach((feature, index) => {
        if (feature.geometry && feature.geometry.coordinates) {
            const coords = feature.geometry.coordinates;
            let latlng;
            
            if (feature.geometry.type === 'Point') {
                latlng = L.latLng(coords[1], coords[0]);
            } else {
                // For polygons, use centroid or first coordinate
                const centroid = getCentroid(feature.geometry);
                latlng = L.latLng(centroid[1], centroid[0]);
            }
            
            L.marker(latlng)
                .addTo(selectionLayer)
                .bindPopup(createFeaturePopup(feature))
                .openPopup();
        }
    });
    
    // Show selection results
    document.getElementById('selectionContent').innerHTML = `
        <p><strong>Features Found:</strong> ${features.length}</p>
        <button class="view-attributes" id="viewAttributes">View Attribute Table</button>
    `;
    document.getElementById('selectionInfo').style.display = 'block';
    
    // Add event listener for attribute table
    document.getElementById('viewAttributes').addEventListener('click', () => {
        showAttributeTable(features);
    });
}

function getCentroid(geometry) {
    if (geometry.type === 'Point') {
        return geometry.coordinates;
    }
    
    // Simple centroid calculation for polygons
    const coords = geometry.coordinates[0]; // exterior ring
    let sumX = 0, sumY = 0;
    
    for (let i = 0; i < coords.length - 1; i++) {
        sumX += coords[i][0];
        sumY += coords[i][1];
    }
    
    return [sumX / (coords.length - 1), sumY / (coords.length - 1)];
}

function createFeaturePopup(feature) {
    const props = feature.properties || {};
    let content = '<div class="feature-popup">';
    
    for (const [key, value] of Object.entries(props)) {
        if (value && key !== 'geom') {
            content += `<strong>${key}:</strong> ${value}<br>`;
        }
    }
    
    content += '</div>';
    return content;
}

function showAttributeTable(features) {
    const tableBody = document.getElementById('attributeTableBody');
    const tableHeaders = document.getElementById('attributeTableHeaders');
    
    // Clear existing content
    tableBody.innerHTML = '';
    tableHeaders.innerHTML = '';
    
    if (features.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10">No features found</td></tr>';
        document.getElementById('attributeModal').style.display = 'flex';
        return;
    }
    
    // Get all unique property keys
    const allKeys = new Set();
    features.forEach(feature => {
        Object.keys(feature.properties || {}).forEach(key => {
            if (key !== 'geom') allKeys.add(key);
        });
    });
    
    const headers = Array.from(allKeys);
    
    // Create table headers
    tableHeaders.innerHTML = '<th>#</th>' + headers.map(header => 
        `<th>${header}</th>`
    ).join('');
    
    // Create table rows
    features.forEach((feature, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${index + 1}</td>` + 
            headers.map(header => 
                `<td>${feature.properties[header] || ''}</td>`
            ).join('');
        tableBody.appendChild(row);
    });
    
    // Show modal
    document.getElementById('attributeModal').style.display = 'flex';
}

// ===== TOOL MANAGEMENT =====
function deactivateAllTools() {
    // Remove measure control
    if (isMeasureActive) {
        map.removeControl(measureControl);
        isMeasureActive = false;
        document.getElementById('measureTool').classList.remove('active');
        document.getElementById('activateMeasure').classList.remove('active');
        document.getElementById('measurementResult').style.display = 'none';
    }
    
    // Remove draw control
    if (isDrawActive) {
        map.removeControl(drawControl);
        isDrawActive = false;
        document.getElementById('drawPolygon').classList.remove('active');
        document.getElementById('drawPolyline').classList.remove('active');
        document.getElementById('activateDrawing').classList.remove('active');
    }
    
    // Remove selection tools
    if (isSelectByPolygonActive) {
        isSelectByPolygonActive = false;
        document.getElementById('selectByPolygon').classList.remove('active');
        document.getElementById('activateSelectPolygon').classList.remove('active');
        map.off('click', handlePointSelection);
    }
    
    if (isSelectByPointActive) {
        isSelectByPointActive = false;
        document.getElementById('selectByPoint').classList.remove('active');
        document.getElementById('activateSelectPoint').classList.remove('active');
        map.off('click', handlePointSelection);
    }
}

// ===== AI ASSISTANT =====
function openAIAssistant() {
    document.getElementById('aiModal').style.display = 'flex';
}

// AI Chat functionality
document.getElementById('sendAiMessage').addEventListener('click', sendAIMessage);
document.getElementById('aiInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        sendAIMessage();
    }
});

// Restart Chat functionality
document.getElementById('restartChat').addEventListener('click', restartAIChat);

function restartAIChat() {
    const messagesContainer = document.getElementById('aiMessages');
    messagesContainer.innerHTML = `
        <div class="ai-message bot">
            <p>Hello! I'm your geology assistant. How can I help you understand the geological data today?</p>
        </div>
    `;
}

function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Add user message
    addAIMessage(message, 'user');
    input.value = '';
    
    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
        const responses = [
            "Based on the geological data, this area shows signs of mineral deposits in sedimentary rock formations.",
            "The fault lines in this region suggest tectonic activity that could be associated with mineral enrichment.",
            "From the geological map, I can see this area has a complex history of volcanic activity and metamorphism.",
            "The rock types in this region indicate a high potential for copper and gold mineralization.",
            "This geological formation is characteristic of areas with significant mineral deposits."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addAIMessage(randomResponse, 'bot');
    }, 1000);
}

function addAIMessage(text, sender) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${sender}`;
    messageDiv.innerHTML = `<p>${text}</p>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== LEGEND FUNCTIONALITY =====
function updateLegend() {
    const legend = document.getElementById('legend');
    const legendContent = document.getElementById('legendContent');
    legendContent.innerHTML = '';
    
    const geologyType = document.getElementById('geologyType').value;
    const isGeologyActive = document.getElementById('geology1M').checked;
    const isMineralsActive = document.getElementById('minerals').checked;
    const isRoadsActive = document.getElementById('Roads').checked;
    const isDistrictsActive = document.getElementById('Districts').checked;
    const isTownsVillagesActive = document.getElementById('TownsVillages').checked;
    const isRegionsActive = document.getElementById('Regions').checked;
    const isCountryActive = document.getElementById('country').checked;
    
    let hasVisibleLayers = false;
    let content = '';
    
    // Regional and National Boundaries Legend Items
    if (isRoadsActive) {
        content += addLegendItem('line', '#ff0000', 'Roads', 2);
        hasVisibleLayers = true;
    }
    
    if (isDistrictsActive) {
        content += addLegendItem('line', '#00aaff', 'Districts', 1, 'dashed');
        hasVisibleLayers = true;
    }
    
    if (isTownsVillagesActive) {
        content += addLegendItem('point', '#ff9900', 'Towns and Villages', 'circle');
        hasVisibleLayers = true;
    }
    
    if (isRegionsActive) {
        content += addLegendItem('line', '#ff00aa', 'Regions', 2);
        hasVisibleLayers = true;
    }
    
    if (isCountryActive) {
        content += addLegendItem('line', '#000000', 'Country Boundary', 3);
        hasVisibleLayers = true;
    }
    
    // Geo-Economic Data Legend Items
    if (isMineralsActive) {
        // Mineral Occurrences with different symbols based on type
        content += addLegendItem('point', '#000000', 'Base and Rare Metals', 'circle', 8, '#ffffff');
        content += addLegendItem('point', '#ff0000', 'Industrial Minerals', 'square', 8, '#000000');
        content += addLegendItem('point', '#ffd700', 'Precious Metals', 'triangle', 10, '#000000');
        content += addLegendItem('point', '#0000ff', 'Precious Stones', 'diamond', 10, '#000000');
        content += addLegendItem('point', '#800080', 'Semi-Precious Stones', 'star', 10, '#000000');
        content += addLegendItem('point', '#00ff00', 'Nuclear Fuel Minerals', 'hexagon', 10, '#000000');
        content += addLegendItem('point', '#a52a2a', 'Dimension Stone', 'square', 8, '#000000');
        hasVisibleLayers = true;
    }
    
    // Geology legend items
    if (isGeologyActive) {
        if (geologyType === 'all' || geologyType === 'igneous') {
            content += addLegendItem('box', '#e74c3c', 'Igneous Rocks');
            hasVisibleLayers = true;
        }
        if (geologyType === 'all' || geologyType === 'sedimentary') {
            content += addLegendItem('box', '#2ecc71', 'Sedimentary Rocks');
            hasVisibleLayers = true;
        }
        if (geologyType === 'all' || geologyType === 'metamorphic') {
            content += addLegendItem('box', '#3498db', 'Metamorphic Rocks');
            hasVisibleLayers = true;
        }
        if (geologyType === 'all' || geologyType === 'faults') {
            content += addLegendItem('line', '#000000', 'Faults and Lineaments', 1);
            hasVisibleLayers = true;
        }
    }
    
    // Show or hide legend based on visible layers
    if (hasVisibleLayers) {
        legend.style.display = 'block';
        legendContent.innerHTML = content;
    } else {
        legend.style.display = 'none';
    }
}

function addLegendItem(type, color, label, width, style, strokeColor, pointSize) {
    let symbolHTML = '';
    
    if (type === 'box') {
        // Simple colored box for geology
        symbolHTML = `<div class="legend-color" style="background-color: ${color}"></div>`;
    } else if (type === 'line') {
        // Line symbol for boundaries
        symbolHTML = `<div class="legend-line" style="border-top: ${width || 2}px ${style || 'solid'} ${color}"></div>`;
    } else if (type === 'point') {
        // Point symbol for towns and minerals
        symbolHTML = `<div class="legend-point ${style || 'circle'}" style="background-color: ${color}; width: ${pointSize || 12}px; height: ${pointSize || 12}px; ${strokeColor ? `border: 1px solid ${strokeColor}` : ''}"></div>`;
    }
    
    return `<div class="legend-item">
        ${symbolHTML}
        <span>${label}</span>
    </div>`;
}

// ===== ROCK IDENTIFIER =====
function initializeRockIdentifier() {
    // User type selection
    const otherRadio = document.querySelector('input[value="other"]');
    const otherSpecifyGroup = document.getElementById('otherSpecifyGroup');
    
    otherRadio.addEventListener('change', () => {
        otherSpecifyGroup.style.display = otherRadio.checked ? 'block' : 'none';
    });
    
    // Method switching
    document.querySelectorAll('.method-card').forEach(card => {
        card.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            
            // Update active method card
            document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding method content
            document.querySelectorAll('.method-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${method}-method`).classList.add('active');
        });
    });
    
    // Image upload functionality
    const uploadButton = document.getElementById('uploadButton');
    const rockImageUpload = document.getElementById('rockImageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const analyzeImage = document.getElementById('analyzeImage');
    const removeImage = document.getElementById('removeImage');
    const openCameraBtn = document.getElementById('openCameraBtn');
    const cameraContainer = document.getElementById('cameraContainer');
    const cameraPreview = document.getElementById('cameraPreview');
    const captureBtn = document.getElementById('captureBtn');
    const cancelCameraBtn = document.getElementById('cancelCameraBtn');
    
    let stream = null;
    
    uploadButton.addEventListener('click', () => {
        rockImageUpload.click();
    });
    
    rockImageUpload.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            displayImage(this.files[0]);
        }
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.backgroundColor = '#f0f8ff';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.backgroundColor = '';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file && file.type.match('image.*')) {
                displayImage(file);
                rockImageUpload.files = e.dataTransfer.files;
            }
        }
    });
    
    // Camera functionality
    openCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            cameraPreview.srcObject = stream;
            cameraContainer.style.display = 'block';
            openCameraBtn.style.display = 'none';
        } catch (err) {
            alert('Could not access the camera: ' + err.message);
        }
    });
    
    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = cameraPreview.videoWidth;
        canvas.height = cameraPreview.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            rockImageUpload.files = dataTransfer.files;
            
            displayImage(file);
            closeCamera();
        }, 'image/jpeg');
    });
    
    cancelCameraBtn.addEventListener('click', closeCamera);
    
    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraContainer.style.display = 'none';
        openCameraBtn.style.display = 'block';
    }
    
    // Analyze image
    analyzeImage.addEventListener('click', function() {
        if (!rockImageUpload.files[0]) {
            alert('Please upload an image first');
            return;
        }
        
        showLoading();
        
        // Simulate analysis (in a real app, this would call an API)
        setTimeout(() => {
            hideLoading();
            showRockResults({
                rockType: 'Granite',
                confidence: '85%',
                description: 'A coarse-grained intrusive igneous rock composed mainly of quartz, feldspar, and mica.',
                characteristics: [
                    'Light-colored with visible crystals',
                    'Hard and durable',
                    'Common in continental crust'
                ],
                mineralComposition: 'Quartz, Feldspar, Mica',
                geologicalAge: 'Precambrian',
                commonUses: 'Building stone, dimension stone, decorative aggregates',
                locationInfo: 'Common in the Damara Orogen geological formation in central Namibia.'
            });
        }, 2000);
    });
    
    // Remove image
    removeImage.addEventListener('click', function() {
        rockImageUpload.value = '';
        uploadPreview.style.display = 'none';
        uploadArea.style.display = 'block';
    });
    
    // Rock description form
    const rockDescriptionForm = document.getElementById('rockDescriptionForm');
    
    rockDescriptionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const color = document.getElementById('rockColor').value;
        const texture = document.getElementById('rockTexture').value;
        const hardness = document.getElementById('rockHardness').value;
        const weight = document.getElementById('rockWeight').value;
        const features = document.getElementById('additionalFeatures').value;
        
        if (!color || !texture || !hardness || !weight) {
            alert('Please fill in all required fields');
            return;
        }
        
        showLoading();
        
        // Simulate analysis based on characteristics
        setTimeout(() => {
            hideLoading();
            
            let rockType, confidence, description, composition, age, uses, location;
            
            // Simple rock identification logic
            if (color === 'light' && texture === 'coarse' && hardness === 'hard') {
                rockType = 'Granite';
                confidence = '78%';
                description = 'A common intrusive igneous rock with visible crystals of quartz, feldspar, and mica.';
                composition = 'Quartz, Feldspar, Mica';
                age = 'Precambrian';
                uses = 'Construction, decorative stone';
                location = 'Common throughout Namibia, especially in central regions';
            } else if (color === 'dark' && texture === 'fine' && hardness === 'hard') {
                rockType = 'Basalt';
                confidence = '82%';
                description = 'A fine-grained extrusive igneous rock, often dark in color with small crystals.';
                composition = 'Plagioclase, Pyroxene, Olivine';
                age = 'Cretaceous to Recent';
                uses = 'Construction aggregate, roadstone';
                location = 'Common in the Etendeka volcanic formations of northwest Namibia';
            } else if (color === 'red' && texture === 'layered' && weight === 'medium') {
                rockType = 'Sandstone';
                confidence = '75%';
                description = 'A sedimentary rock composed of sand-sized mineral particles or rock fragments.';
                composition = 'Quartz, Feldspar, Rock fragments';
                age = 'Various geological periods';
                uses = 'Building material, decorative stone';
                location = 'Found throughout Namibia in sedimentary basins';
            } else {
                rockType = 'Mixed Rock Type';
                confidence = '65%';
                description = 'Based on the characteristics provided, this appears to be a complex rock formation.';
                composition = 'Various minerals';
                age = 'Unknown';
                uses = 'Requires further analysis';
                location = 'Various locations throughout Namibia';
            }
            
            showRockResults({
                rockType: rockType,
                confidence: confidence,
                description: description,
                characteristics: [
                    `Color: ${document.getElementById('rockColor').options[document.getElementById('rockColor').selectedIndex].text}`,
                    `Texture: ${document.getElementById('rockTexture').options[document.getElementById('rockTexture').selectedIndex].text}`,
                    `Hardness: ${document.getElementById('rockHardness').options[document.getElementById('rockHardness').selectedIndex].text}`,
                    `Weight: ${document.getElementById('rockWeight').options[document.getElementById('rockWeight').selectedIndex].text}`
                ],
                mineralComposition: composition,
                geologicalAge: age,
                commonUses: uses,
                locationInfo: location
            });
        }, 1500);
    });
    
    // Location-based identification
    const searchLocation = document.getElementById('searchLocation');
    const locationSearch = document.getElementById('locationSearch');
    const getLocationBtn = document.getElementById('getLocationBtn');
    const getLocationBtnAll = document.getElementById('getLocationBtnAll');
    const coordinatesDisplay = document.getElementById('coordinatesDisplay');
    const coordinatesDisplayAll = document.getElementById('coordinatesDisplayAll');
    
    // Initialize mini map for location method
    const locationMap = L.map('locationMap', {
        center: [-22.5609, 17.0658], // Windhoek
        zoom: 6,
        scrollWheelZoom: false,
        dragging: false,
        zoomControl: false
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(locationMap);
    
    // Initialize large map for location selection
    const locationMapAll = L.map('locationMapAll', {
        center: [-22.5609, 17.0658], // Windhoek
        zoom: 6
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(locationMapAll);
    
    let locationMarker = null;
    let locationMarkerAll = null;
    let currentLocation = null;
    
    locationMap.on('click', function(e) {
        if (locationMarker) {
            locationMap.removeLayer(locationMarker);
        }
        
        locationMarker = L.marker(e.latlng).addTo(locationMap);
        currentLocation = e.latlng;
        coordinatesDisplay.textContent = 
            `Latitude: ${e.latlng.lat.toFixed(6)}, Longitude: ${e.latlng.lng.toFixed(6)}`;
        identifyRocksByLocation(e.latlng);
    });
    
    locationMapAll.on('click', function(e) {
        if (locationMarkerAll) {
            locationMapAll.removeLayer(locationMarkerAll);
        }
        
        locationMarkerAll = L.marker(e.latlng).addTo(locationMapAll);
        currentLocation = e.latlng;
        coordinatesDisplayAll.textContent = 
            `Latitude: ${e.latlng.lat.toFixed(6)}, Longitude: ${e.latlng.lng.toFixed(6)}`;
    });
    
    // Location functionality for both buttons
    function setupLocationButton(button, coordinatesElement) {
        button.addEventListener('click', () => {
            if (navigator.geolocation) {
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        currentLocation = { lat: latitude, lng: longitude };
                        
                        // Update map view
                        locationMapAll.setView([latitude, longitude], 12);
                        
                        // Add marker
                        if (locationMarkerAll) {
                            locationMapAll.removeLayer(locationMarkerAll);
                        }
                        locationMarkerAll = L.marker([latitude, longitude]).addTo(locationMapAll)
                            .bindPopup('Your current location')
                            .openPopup();
                        
                        // Update coordinates display
                        coordinatesElement.textContent = 
                            `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`;
                        
                        button.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
                    },
                    (error) => {
                        alert('Error getting location: ' + error.message);
                        button.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                alert('Geolocation is not supported by your browser');
            }
        });
    }
    
    setupLocationButton(getLocationBtn, coordinatesDisplay);
    setupLocationButton(getLocationBtnAll, coordinatesDisplayAll);
    
    searchLocation.addEventListener('click', function() {
        const query = locationSearch.value.trim();
        if (query) {
            // Simple location search (in a real app, this would use geocoding)
            showLoading();
            
            setTimeout(() => {
                hideLoading();
                
                // Sample locations and their common rocks
                const locationRocks = {
                    'windhoek': ['Granite', 'Schist', 'Gneiss'],
                    'swakopmund': ['Sandstone', 'Limestone', 'Basalt'],
                    'tsumeb': ['Dolomite', 'Copper-bearing rocks', 'Schist'],
                    'fish river': ['Sandstone', 'Shale', 'Quartzite'],
                    'etosha': ['Limestone', 'Dolomite', 'Sandstone']
                };
                
                const normalizedQuery = query.toLowerCase();
                let rocks = ['Granite', 'Schist', 'Sandstone']; // Default
                
                for (const loc in locationRocks) {
                    if (normalizedQuery.includes(loc)) {
                        rocks = locationRocks[loc];
                        break;
                    }
                }
                
                displayCommonRocks(rocks);
            }, 1000);
        }
    });
    
    // Information request form
    const infoRequestForm = document.getElementById('infoRequestForm');
    const submitRequestBtn = document.getElementById('submitRequestBtn');
    const successModal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const successMessage = document.getElementById('successMessage');
    
    infoRequestForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const rockType = document.getElementById('rockTypeFound').value;
        
        if (!fullName || !email || !rockType) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // In a real app, this would submit to a backend
        successMessage.textContent = 
            `Thank you, ${fullName}! Your request about ${rockType} has been submitted successfully. ` +
            `A geologist will contact you at ${email} within 3 working days.`;
        
        successModal.style.display = 'flex';
    });
    
    closeModalBtn.addEventListener('click', () => {
        successModal.style.display = 'none';
    });
    
    // New identification button
    document.getElementById('newIdentification').addEventListener('click', function() {
        document.getElementById('resultsSection').style.display = 'none';
        rockDescriptionForm.reset();
        rockImageUpload.value = '';
        uploadPreview.style.display = 'none';
        uploadArea.style.display = 'block';
        infoRequestForm.reset();
        
        // Reset to upload method
        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
        document.querySelector('.method-card[data-method="upload"]').classList.add('active');
        document.querySelectorAll('.method-content').forEach(c => c.classList.remove('active'));
        document.getElementById('upload-method').classList.add('active');
    });
}

function identifyRocksByLocation(latlng) {
    showLoading();
    
    // Simulate API call to get rocks for location
    setTimeout(() => {
        hideLoading();
        
        // Sample data based on coordinates
        let rocks;
        if (latlng.lat > -20) {
            rocks = ['Granite', 'Gneiss', 'Schist']; // Northern regions
        } else if (latlng.lng > 16) {
            rocks = ['Sandstone', 'Limestone', 'Shale']; // Eastern regions
        } else {
            rocks = ['Basalt', 'Gabbro', 'Dolerite']; // Western regions
        }
        
        displayCommonRocks(rocks);
    }, 1000);
}

function displayCommonRocks(rocks) {
    const rocksList = document.getElementById('rocksList');
    rocksList.innerHTML = '';
    
    rocks.forEach(rock => {
        const rockItem = document.createElement('div');
        rockItem.className = 'rock-item';
        rockItem.innerHTML = `
            <h5>${rock}</h5>
            <p>Common in this area. Click for more details.</p>
            <button class="rock-detail-btn" data-rock="${rock}">View Details</button>
        `;
        rocksList.appendChild(rockItem);
    });
    
    // Add event listeners to detail buttons
    document.querySelectorAll('.rock-detail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const rockType = this.getAttribute('data-rock');
            showRockDetail(rockType);
        });
    });
}

function showRockDetail(rockType) {
    // Sample rock data
    const rockData = {
        'Granite': {
            description: 'A coarse-grained intrusive igneous rock composed mainly of quartz, feldspar, and mica.',
            formation: 'Forms from the slow crystallization of magma below Earth\'s surface.',
            characteristics: ['Visible crystals', 'Light-colored', 'Hard and durable'],
            mineralComposition: 'Quartz, Feldspar, Mica',
            geologicalAge: 'Precambrian',
            commonUses: 'Building stone, countertops, monuments',
            locationInfo: 'Common in the Damara Orogen geological formation in central Namibia'
        },
        'Sandstone': {
            description: 'A sedimentary rock composed of sand-sized mineral particles or rock fragments.',
            formation: 'Forms from the cementation of sand grains by minerals like silica or calcite.',
            characteristics: ['Gritty texture', 'Layered appearance', 'Porous'],
            mineralComposition: 'Quartz, Feldspar, Rock fragments',
            geologicalAge: 'Various geological periods',
            commonUses: 'Construction, paving, decorative stone',
            locationInfo: 'Found throughout Namibia, especially in sedimentary basins'
        },
        'Basalt': {
            description: 'A fine-grained extrusive igneous rock formed from the rapid cooling of lava.',
            formation: 'Forms from volcanic activity and lava flows.',
            characteristics: ['Dark-colored', 'Fine-grained', 'Dense'],
            mineralComposition: 'Plagioclase, Pyroxene, Olivine',
            geologicalAge: 'Cretaceous to Recent',
            commonUses: 'Construction aggregate, railroad ballast, flooring tiles',
            locationInfo: 'Common in volcanic regions of Namibia, especially in the northwest'
        }
    };
    
    const data = rockData[rockType] || {
        description: 'Information not available for this rock type.',
        formation: 'Unknown',
        characteristics: ['No data available'],
        mineralComposition: 'Unknown',
        geologicalAge: 'Unknown',
        commonUses: 'No data available',
        locationInfo: 'Unknown'
    };
    
    showRockResults({
        rockType: rockType,
        confidence: 'Location-based identification',
        description: data.description,
        characteristics: data.characteristics,
        mineralComposition: data.mineralComposition,
        geologicalAge: data.geologicalAge,
        commonUses: data.commonUses,
        locationInfo: data.locationInfo
    });
}

function showRockResults(data) {
    const resultsContent = document.getElementById('resultsContent');
    
    resultsContent.innerHTML = `
        <div class="rock-result-header">
            <h4>${data.rockType}</h4>
            <span class="confidence-badge">${data.confidence} confidence</span>
        </div>
        <div class="rock-result-description">
            <p>${data.description}</p>
        </div>
        <div class="rock-result-details">
            <div class="detail-section">
                <h5>Characteristics</h5>
                <ul>
                    ${data.characteristics.map(char => `<li>${char}</li>`).join('')}
                </ul>
            </div>
            <div class="detail-section">
                <h5>Mineral Composition</h5>
                <p>${data.mineralComposition}</p>
            </div>
            <div class="detail-section">
                <h5>Geological Age</h5>
                <p>${data.geologicalAge}</p>
            </div>
            <div class="detail-section">
                <h5>Common Uses</h5>
                <p>${data.commonUses}</p>
            </div>
            <div class="detail-section">
                <h5>Location Information</h5>
                <p>${data.locationInfo}</p>
            </div>
        </div>
    `;
    
    // Set the rock type in the request form
    document.getElementById('rockTypeFound').value = data.rockType;
    
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

function displayImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = event.target.result;
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('uploadArea').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Initial legend update
updateLegend();