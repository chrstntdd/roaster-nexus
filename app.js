'use strict';

$(function(){
  getUserLocation();
  handleUseCurrentLocation();
});

function getUserLocation (){
  $('#location-form').submit(function(e){
    e.preventDefault();
    var location = $('#location-form input').val();
    this.reset();
    $('html, body').animate({
      scrollTop: $('.wrapper').offset().top
    }, 1000);
    renderUserLocation(location);
  });
}

function renderUserLocation (location){
  $('#location').text(location);
}

function handleUseCurrentLocation() {
  $('#current-loc-btn').click(function (e) {
    initMap();
    $('html, body').animate({
      scrollTop: $('.wrapper').offset().top
    }, 2000);
    $('#location').html(''); //clear old location
    $('#result-cards').html(''); //clear old results
  });
}

var myMap;
var infowindow;

function initMap() {
   myMap = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 36.799564, 
      lng: -76.091784
    },
    zoom: 12
  });
  infowindow = new google.maps.InfoWindow({
    map: myMap
  });

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      reverseGeocode(pos);

      infowindow.setPosition(pos);
      infowindow.setContent('Location found.');
      myMap.setCenter(pos);

      var request = {
        location: pos,
        radius: '1000',
        types: ['cafe']
      };
      
      var service = new google.maps.places.PlacesService(myMap);
      service.nearbySearch(request, callback);

    }, function () {
      handleLocationError(true, infoWindow, myMap.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, myMap.getCenter());
  }
}

function reverseGeocode(pos){
  //convert lat & long from geolocation to a string location
  var geocoder = new google.maps.Geocoder();
  var latlng = new google.maps.LatLng(pos.lat,pos.lng);

  geocoder.geocode({'latLng': latlng}, function(results, status){
    if (status == google.maps.GeocoderStatus.OK){
      renderArea((results[2].formatted_address));
    } else {
      //alert the user that their locaiton cannot be determined.
      console.error('Can\'t reverse geocode this locaiton');
    }
  })
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
}

function callback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
    results.map(result => createMarker(result));
  } else {
    //ALERT THE USER THAT NO RESULTS WERE FOUND
    console.log('Sorry, no results :(')
  }
}

function createMarker(place) {
  getPlaceDetails(place.place_id);
  var placeLoc = {
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng()
  }

  var marker = new google.maps.Marker({
    position: placeLoc,
    map: myMap
  });

  marker.setMap(myMap);

  google.maps.event.addListener(marker, 'click', function () {
    infowindow.setContent(place.name);
    infowindow.open(map, this);
  });

}

function getPlaceDetails(place_id) {
  // aggregate relevant place details
  var request = {
    placeId: place_id
  };

  var service = new google.maps.places.PlacesService(myMap);
  service.getDetails(request, function (data) {
    var details = {
      name: data.name || null,
      addr: data.formatted_address,
      open: data.opening_hours ? data.opening_hours.open_now : null,
      phone: data.international_phone_number,
      website: data.website || null,
      rating: data.rating ? data.rating : null,
      photos: data.photos ? data.photos : null,
      photoDimension: {'maxWidth' : data.photos[0].width,
                       'maxHeight': data.photos[0].height
                      }
    }
    renderResultCard(details);
  });
}

function renderArea(area){
  $('#location').text('Results for ' + area);
}

function renderResultCard(details){
  //render place details into the DOM

  var resultCardHtml = (
    '<li>' +
      '<article class="result">' +
        '<img src="" alt="">' +
        '<h3 class="name"></h3>' +
        '<p class="address"></p>' +
        '<p class="open-closed"></p>' +
        '<div class="rating"></div>' +
      '</article>' +
    '</li>'
  );
  
  var $res = $(resultCardHtml);
  
  $res.find('.name').text(details.name);
  $res.find('.address').text(details.addr);
  $res.find('.open-closed').text(details.open ? 'Open now' : 'Closed');
  $res.find('.rating').text('Rating: ' + details.rating);
  $res.find('img').attr('src', details.photos[0].getUrl(details.photoDimension))

  $('#result-cards').append($res);
}
