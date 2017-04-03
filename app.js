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
    e.preventDefault();
    console.log('pressed');
    initMap();
  });
}


function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: -34.397,
      lng: 150.644
    },
    zoom: 6
  });
  var infoWindow = new google.maps.InfoWindow({
    map: map
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
      map.setCenter(pos);
    }, function () {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
}