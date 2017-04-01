'use strict';

$(function(){
  getUserLocation();
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