'use strict';

$(function(){
  handleAutocompleteInput();
  handleUseCurrentLocation();
  handleCardClick();
  googleAutoComplete();
});

function googleAutoComplete (){
  // allow text input to autocomplete to cities
  var options = {
    types: ['(cities)'],
    componentRestrictions: {country: 'us'}
  };

  var input = document.getElementById('autocomplete');
  var myAutocomplete = new google.maps.places.Autocomplete(input, options);

  myAutocomplete.addListener('place_changed', function(){
    // get geolocation of autocompleted city
    var place = myAutocomplete.getPlace();
    var pos = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    }
    initMap(pos);
  });
}

function handleAutocompleteInput (){
  // get user location from autocomplete text input
  $('#location-form').submit(function(e){
    e.preventDefault();
    var location = $('#location-form input').val();
    this.reset();
    scrollToResults();
    renderArea(location);
  });
}

function handleUseCurrentLocation() {
  // get user location from geolocation button
  $('#current-loc-btn').click(function (e) {
    getGeoLatLng();
    scrollToResults();
  });
}

function scrollToResults() {
  // scroll to results and remove old data from view
  $('.wrapper').removeClass('hidden');
  $('html, body').animate({
    scrollTop: $('.wrapper').offset().top
  }, 2000);
  $('#location, #result-cards').html('');
  labelCount = 1;
}

var state = {
  results: []
}

var myMap;
var infowindow;
var labelCount = 1;

function getGeoLatLng() {
  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      reverseGeocode(pos);
      initMap(pos);

      infowindow.setPosition(pos);
      infowindow.setContent('You are here.');
      myMap.setCenter(pos);

    }, function () {
      handleLocationError(true, infowindow, myMap.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infowindow, myMap.getCenter());
  };
}

function initMap(pos) {
   myMap = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: pos.lat,
      lng: pos.lng
    },
    zoom: 14,
    streetViewControl: false,
    scrollwheel: false
  });

  infowindow = new google.maps.InfoWindow({
    map: myMap
  });
  getNearbySearch(pos);
}

function getNearbySearch(pos) {
  // call nearbySearch for local coffee shops
  var request = {
    location: pos,
    keyword: 'coffee',
    rankBy: google.maps.places.RankBy.DISTANCE
  };

  var service = new google.maps.places.PlacesService(myMap);
  service.nearbySearch(request, callback);
}

function reverseGeocode(pos){
  //convert lat & long from geolocation to a string location
  var geocoder = new google.maps.Geocoder();
  var latlng = new google.maps.LatLng(pos.lat,pos.lng);

  geocoder.geocode({'latLng': latlng}, function(results, status){
    if (status == google.maps.GeocoderStatus.OK){
      renderArea((results[1].formatted_address));
    } else {
      //alert the user that their locaiton cannot be determined.
      console.error('Can\'t reverse geocode this locaiton');
    }
  })
}

function handleLocationError(browserHasGeolocation, infowindow, pos) {
  infowindow.setPosition(pos);
  infowindow.setContent(browserHasGeolocation ?
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
  var placeLoc = {
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng()
  }
  var marker = new google.maps.Marker({
    position: placeLoc,
    label: labelCount.toString(),
    map: myMap
  });
  labelCount++;

  marker.setMap(myMap);

  google.maps.event.addListener(marker, 'click', function () {
    infowindow.setContent(place.name);
    infowindow.open(map, this);
  });
  getPlaceDetails(place.place_id, marker.label);
}

function getPlaceDetails(place_id, label) {
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
                      },
      label: label
    }
    state.results.push(details); //push details of each result to state object for data binding.
    state.results.sort((a,b) => parseInt(a.label) - parseInt(b.label)); //sort results by lowest label count to highest
    renderResultCard(details);
  });
}

function renderArea(area){
  $('#location').text('Coffee roasters in ' + area);
}

function renderResultCard(details, label){
  //render place details into the DOM

  var resultCardHtml = (
    '<li>' +
      '<article class="result">' +
        '<img src="" alt="">' +
        '<div>' +
          '<p class="label"></p>' +
          '<h3 class="name"></h3>' +
          '<p class="open-closed"></p>' +
          '<p class="address"></p>' +
          '<p class="rating"></p>' +
        '</div>' +
      '</article>' +
    '</li>'
  );
  
  var $res = $(resultCardHtml);
  
  $res.find('.name').text(details.name);
  $res.find('.label').text(details.label);
  $res.find('.address').text(details.addr);
  $res.find('.open-closed').text(details.open ? 'Open now' : 'Closed');
  $res.find('.rating').text(details.rating == null ? 'No rating.' : 'Rating: ' + details.rating);
  $res.find('img').attr('src', details.photos[0].getUrl(details.photoDimension))

  $('#result-cards').append($res);
}

function handleCardClick(){
  $('#result-list').on('click', '.result', function(e){
    var thisCardIndex = $(this).find('.label').text();//get the label number of the card clicked on.
    console.log(state.results);
  });
}