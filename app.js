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
  results: [],
  detailedResults: []
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
    keyword: 'roaster',
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
    results.map(element => state.results.push(element));
    createMarker();
  } else {
    //ALERT THE USER THAT NO RESULTS WERE FOUND
    console.log('Sorry, no results :(')
  }
}

function createMarker() {
  state.results.map(function (element) {
    var placeLoc = {
      lat: element.geometry.location.lat(),
      lng: element.geometry.location.lng()
    }
    var marker = new google.maps.Marker({
      position: placeLoc,
      label: labelCount.toString(),
      map: myMap
    });
    element.label = marker.label;
    labelCount++;

    marker.setMap(myMap);

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(element.name);
      infowindow.open(map, this);
    });
  });
  getPlaceDetails();
}

function getPlaceDetails() {
  // aggregate relevant place details

 /*BIG thanks to http://bit.ly/2oPkcqa for providing me with the ability 
 to timeout my requests to service.getDetails so not as to hit the query 
 limit  */
  for (var i = 0; i < state.results.length; i++) {
    setTimeout(function (x) {
      return function () {
        var request = {
          placeId: state.results[x].place_id
        };
        var service = new google.maps.places.PlacesService(myMap);
        service.getDetails(request, detailsCallback);
      };
    }(i), 300 * i);
  }


  function detailsCallback(results, status){
    if (status == google.maps.places.PlacesServiceStatus.OK){
      var details = {
      name: results.name || null,
      addr: results.formatted_address,
      open: results.opening_hours ? results.opening_hours.open_now : null,
      phone: results.international_phone_number,
      website: results.website || null,
      rating: results.rating ? results.rating : null,
      photos: results.photos ? results.photos : null,
      photoDimension: {'maxWidth' : results.photos[0].width,
                       'maxHeight': results.photos[0].height
                      },
      label: state.detailedResults.length + 1
    }
    state.detailedResults.push(details); //push details of each result to state object for data binding.

    //when loop is finished
    if (state.detailedResults.length == state.results.length){
      renderResultCard();
    }

    } else if (status == google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT){
      console.error(status);
    }
  }
    state.results.sort((a,b) => parseInt(a.label) - parseInt(b.label)); //sort results by lowest label count to highest
}

function renderArea(area){
  $('#location').text('Coffee roasters in ' + area);
}

function renderResultCard() {
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

  state.detailedResults.map(function (element) {
    var $res = $(resultCardHtml);

    $res.find('.name').text(element.name);
    $res.find('.label').text(element.label);
    $res.find('.address').text(element.addr);
    $res.find('.open-closed').text(element.open ? 'Open now' : 'Closed');
    $res.find('.rating').text(element.rating == null ? 'No rating.' : 'Rating: ' + element.rating);
    $res.find('img').attr('src', element.photos[0].getUrl(element.photoDimension));

    $('#result-cards').append($res);
  });
}

function handleCardClick(){
  $('#result-list').on('click', '.result', function(e){
    var thisCardIndex = $(this).find('.label').text();//get the label number of the card clicked on.
    console.log(state);
  });
}