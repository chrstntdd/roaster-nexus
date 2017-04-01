'use strict';

$(function(){
  getUserLocation();
});

function getUserLocation (){
  $('#location-form').submit(function(e){
    e.preventDefault();
    var location = $('#location-form input').val();
    this.reset();
  });
}