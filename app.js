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
  var infoWindow = new google.maps.InfoWindow({
    map: myMap
  });

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      infoWindow.setPosition(pos);
      infoWindow.setContent('Location found.');
      myMap.setCenter(pos);

      var request = {
        location: pos,
        radius: '500',
        type: ['store']
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

}

function getPlaceDetails(place_id) {
  var request = {
    placeId: place_id
  };

  var service = new google.maps.places.PlacesService(myMap);
  service.getDetails(request, function (data) {
    console.log(data);
  });
}