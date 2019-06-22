window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

$( document ).ready(function() {

  const DATA_URL = '';
  mapboxgl.accessToken = 'pk.eyJ1IjoiaHN3OTgiLCJhIjoiY2oyOXh2dzlxMDAwYzJ3bzcyMnRseXcxNCJ9.1h5sGCIL0Pig6OmgZdDBMg';

  let isMobile = $(window).width()<600? true : false;
  let dataUrls = ['segment1.geojson','segment2.geojson','segment3.geojson','segment4.geojson','segment5.geojson'];
  let geoDataArray = new Array(dataUrls.length);
  let tickerArray = new Array(dataUrls.length);
  let map;

  //set scroll gap between steps to be height of viewport
  $('.step').css('marginBottom', $(window).height());
  $('article').css('marginTop', $(window).height());

  let narrative = $('#narrative'),
    sections = narrative.find('section'),
    currentSection = '';
    currentIndex = 1;

  let narrativeHeight = narrative.outerHeight();
  let sectionsHeight = $('#sections').height();
  let articlePosition = sectionsHeight-$('article').outerHeight()-narrative.outerHeight();
  narrative.scroll(function(e) {
    //make sure map is at top of page
    if (!isMobile && $(window).scrollTop()>0) {
      $('html, body').animate({scrollTop: 0}, 500);
    }

    let newSection = currentSection;

    //show ticker
    if (narrative.scrollTop() >= $('.hero').outerHeight()-200) {
      $('.ticker').addClass('active');
    }
    else {
      $('.ticker').removeClass('active');
    }

    //show article
    if (narrative.scrollTop() > articlePosition) {
      $('#map').addClass('unpin');
      $('#map').css('height', $(window).height());
      $('article').css('marginTop', '0px');
    }
    else {
      $('#map').removeClass('unpin');
      $('#map').css('height', 'auto');
      $('article').css('marginTop', $(window).height());
    }
    
    //detect current section in view
    for (let i=sections.length-1; i>=0; i--) {
      let rect = sections[i].getBoundingClientRect();
      if (rect.top >= 0 && rect.top <= narrativeHeight) {
        newSection = sections[i].id;
        currentIndex = i;
      }
    };

    setSection(newSection);
  });


  let videoContainer = document.querySelector('.video-container');
  let vid = document.getElementById('droneVideo'); 
  $(window).scroll(function(e) {
    $('.ticker').removeClass('active');
    
    if (isScrolledIntoView(videoContainer)) vid.play();
    else vid.pause();
  });


  function isScrolledIntoView(el) {
    var rect = el.getBoundingClientRect();
    var elemTop = rect.top;
    var elemBottom = rect.bottom;

    // Only completely visible elements return true:
    //var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
    // Partially visible elements return true:
    isVisible = elemTop < window.innerHeight && elemBottom >= 0;
    return isVisible;
  }


  function updateTicker(value) {
    $('.ticker p').animate({
      opacity: 0,
      marginTop: '50px',
    }, 400, function() {
      $(this).text(value);
      $(this).css('marginTop', '-50px').animate({
        opacity: 1,
        marginTop: '0'
      }, 400);
    });
  }

  function setSection(newSection) {
    // update map if id changed
    if (newSection === currentSection) return;
    
    //update ticker
    updateTicker(tickerArray[currentIndex]);

    //fit map to bounds of current section
    if (geoDataArray[currentIndex]!==undefined) {
      let padding = 100;
      setMapBounds(geoDataArray[currentIndex], padding);

      if (animationDone) {
        animateLine();
        animationDone = false;
      }
    }
    
    // highlight the current section
    for (var i = 0; i < sections.length; i++) {
      sections[i].className = sections[i].id === newSection ? 'active' : '';
    }
    currentSection = newSection;
    //map.setLayoutProperty('locationPoints', 'visibility', 'visible');
  }


  function setMapBounds(points, padding) {
    let bbox = turf.extent(points);
    if (isMobile)
      map.fitBounds(bbox, {padding: {top: 80, bottom: 80, left: 60, right: 60}});
    else
      map.fitBounds(bbox, {offset: [-100,0], padding: padding});
  }


  function getData() {
    dataUrls.forEach(function (url, index) {
      loadData(url, function (responseText) {
        parseData(JSON.parse(responseText), index);
      })
    })
  }


  function loadData(dataPath, done) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () { return done(this.responseText) }
    xhr.open('GET', DATA_URL+'data/'+dataPath, true);
    xhr.send();
  }

  function initMap() {
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/hsw98/cjx44orzy51b21cqttgaolgq0',//mapbox://styles/mapbox/satellite-v9',
      center: [20, 5.5],
      zoom: 6,
      attributionControl: false
    });

    map.addControl(new mapboxgl.AttributionControl(), 'bottom-right');

    //disable scrolling map zoom
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();

    //add icon images
    let iconArray = ['icon_start', 'icon_middle'];
    iconArray.forEach(function(imageName) {
      map.loadImage(DATA_URL+'assets/icons/'+imageName+'.png', function(error, image) {
        map.addImage(imageName, image);
      });
    });

    //get data
    map.on('load', function() {
      locationData();
      getData();
    });
  }


  function locationData() {
    map.addSource('locationSource', {
      type: 'geojson',
      data: DATA_URL+'data/geodata_locations.geojson'
    });

    map.addLayer({
      'id': 'locationPoints',
      'type': 'symbol',
      'source': 'locationSource',
      'layout': {
        //'visibility': 'none',
        'icon-image': '{icon}',
        'icon-size': { 'type': 'identity', 'property': 'iconSize' },
        'text-field': '{name}',
        'text-font': ['PT Sans Bold Italic', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-max-width': { 'type': 'identity', 'property': 'textMaxWidth' },
        'text-justify': 'left',
        'text-offset': { 'type': 'identity', 'property': 'textOffset' },
        'text-anchor': { 'type': 'identity', 'property': 'textAnchor' },
        'icon-allow-overlap': false,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#FFF'
      }
    });
  }

  let countArray = new Array(dataUrls.length);
  function parseData(geoData, index) {
    countArray[index] = 0;
    geoDataArray[index] = geoData;
    tickerArray[index] = geoData.features[0].properties.ticker;
    let layer = 'layer'+index;
    let geo = {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          'coordinates': [geoData.features[0].geometry.coordinates[0]]
        }
      }]
    };

    map.addLayer({
      'id': layer,
      'type': 'line',
      'source': {
        'type': 'geojson',
        'data': geo
      },
      'layout': {
        'line-join': 'round',
        'line-cap': 'round'
      },
      'paint': {
        'line-color': '#FFF',
        'line-width': 3
      }
    }, 'locationPoints')
  }

  let animation; 
  let animationIndex = 0;
  let animationDone = true;
  function animateLine() {
    let geoData = geoDataArray[animationIndex];
    let layer = 'layer'+animationIndex;
    let count = countArray[animationIndex];
    if (geoData!=undefined && count<geoData.features[0].geometry.coordinates.length) {
      let count = countArray[animationIndex]++;
      let newGeo = map.getSource(layer)._data;
      newGeo.features[0].geometry.coordinates.push(geoData.features[0].geometry.coordinates[count]);
      map.getSource(layer).setData(newGeo);

      animation = requestAnimationFrame(function() {
        animateLine();
      });
    }
    else {
      animationDone = true;
      animationIndex++;
      if (currentIndex>=animationIndex) animateLine();
    }
  }


  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = window.location.hostname==='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  function initSlideshows() {
    $('.slideshow').slick({
      dots: true,
      lazyLoad: 'progressive',
    });

    $('.slideshow .slick-slide img').each(function(){ 
      if ($(this).attr('title')){
        var slideCaption = $(this).attr('title');
        $(this).parent().append('<div class="slide-caption">' + slideCaption + '</div>');
      }
    });
  }

  initSlideshows();
  initMap();
  initTracking();
});