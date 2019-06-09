$( document ).ready(function() {

  const DATA_URL = '';
  mapboxgl.accessToken = 'pk.eyJ1IjoiaHN3OTgiLCJhIjoiY2oyOXh2dzlxMDAwYzJ3bzcyMnRseXcxNCJ9.1h5sGCIL0Pig6OmgZdDBMg';

  let isMobile = $(window).width()<600? true : false;
  let dataUrls = ['segment1.geojson','segment2.geojson','segment3.geojson','segment4.geojson','segment5.geojson'];
  let geoDataArray = new Array(dataUrls.length);
  let tickerArray = new Array(dataUrls.length);
  let map;

  let narrative = $('#narrative'),
    sections = narrative.find('section'),
    currentSection = '';
    currentIndex = 1;

  narrative.scroll(function(e) {
    let narrativeHeight = narrative.outerHeight();
    let newSection = currentSection;
    let sectionsHeight = $('#sections').height();
    let articlePosition = sectionsHeight-$('article').outerHeight()-narrative.outerHeight();

    //show ticker
    if (narrative.scrollTop() >= $('.hero').outerHeight() && narrative.scrollTop() < articlePosition) {
      $('.ticker').addClass('active');
    }
    else {
      $('.ticker').removeClass('active');
    }

    //show article
    if (narrative.scrollTop() > articlePosition) {
      $('#map').addClass('unpin');
      $('#map').css('height', $(window).height());
      $('footer').show();
    }
    else {
      $('#map').removeClass('unpin');
      $('#map').css('height', 'auto');
      $('footer').hide();
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


  function showArticle() {
    console.log(window.innerHeight);
    $('#map').css('position', 'relative');
    $('#map').css('height', window.innerHeight);
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
    //   let padding = {};
    //   switch(currentIndex) {
    //     case 4:
    //       padding = 120;
    //       break;
    //     default:
    //       padding = 100;
    //   }

      let padding = 100;
      setMapBounds(geoDataArray[currentIndex], padding);

      animateLine();
    }
    
    // highlight the current section
    for (var i = 0; i < sections.length; i++) {
      sections[i].className = sections[i].id === newSection ? 'active' : '';
    }
    currentSection = newSection;
  }


  function setMapBounds(points, padding) {
    let bbox = turf.extent(points);
    if (isMobile)
      map.fitBounds(bbox, {padding: {top: 40, bottom: 40, left: 0, right: 0}});
    else
      map.fitBounds(bbox, {offset: [0,0], padding: padding});
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
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [20, 5.5],
      zoom: 6.8,
      attributionControl: false
    });

    map.addControl(new mapboxgl.AttributionControl(), 'top-right');

    //disable scrolling map zoom
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();

    //add icon images
    let iconArray = ['icon_circle'];
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
        'icon-image': 'icon_circle',
        'icon-offset': { 'type': 'identity', 'property': 'iconOffset' },
        'text-field': '{name}',
        'text-font': ['PT Sans Bold Italic', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': { 'type': 'identity', 'property': 'textOffset' },
        'text-anchor': { 'type': 'identity', 'property': 'textAnchor' },
        'icon-allow-overlap': true,
        'text-allow-overlap': true
      },
      paint: {
        "text-color": "#FFF"
      }
    });
  }

  let countArray = new Array(dataUrls.length);
  function parseData(geoData, index) {
    countArray[index] = 0;
    geoDataArray[index] = geoData;
    tickerArray[index] = geoData.features[0].properties.ticker;
    let name = geoData.features[0].properties.name.replace(/ /g, '').toLowerCase()
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
        'line-width': 2
      }
    })
  }

  let animation; // to store and cancel the animation
  function animateLine() {
    let geoData = geoDataArray[currentIndex];
    let layer = 'layer'+currentIndex;
    let count = countArray[currentIndex];
    if (count<geoData.features[0].geometry.coordinates.length) {
      let count = countArray[currentIndex]++;
      let newGeo = map.getSource(layer)._data;
      newGeo.features[0].geometry.coordinates.push(geoData.features[0].geometry.coordinates[count]);
      map.getSource(layer).setData(newGeo);

      // Request the next frame of the animation.
      animation = requestAnimationFrame(function() {
        animateLine();
      });
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

    $('.slideshow .slick-slide > img').each(function(){ 
      if ($(this).attr('title')){
        var slideCaption = $(this).attr('title');
        $(this).parent('.slick-slide').append('<div class="slide-caption">' + slideCaption + '</div>');
      }
    });
  }

  initSlideshows();
  initMap();
  initTracking();
});