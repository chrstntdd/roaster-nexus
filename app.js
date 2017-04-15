'use strict';

$(function () {
  handleAutocompleteInput();
  handleUseCurrentLocation();
  handleCardClick();
  googleAutoComplete();
  handleReturnToResults();
  testScreenSize();
});

function googleAutoComplete() {
  // allow text input to autocomplete to cities
  var options = {
    types: ['(cities)'],
    componentRestrictions: {
      country: 'us'
    }
  };

  var input = document.getElementById('autocomplete');
  var myAutocomplete = new google.maps.places.Autocomplete(input, options);

  myAutocomplete.addListener('place_changed', function () {
    // get geolocation of autocompleted city
    var place = myAutocomplete.getPlace();
    pos = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    }
    initMap(pos);
  });
}

function handleAutocompleteInput() {
  // get user location from autocomplete text input
  $('#location-form').submit(function (e) {
    e.preventDefault();
    var location = $('#location-form input').val();
    this.reset();
    resetDetails();
    scrollToResults();
    renderArea(location);
  });
}

function resetDetails() {
  $('#details').html('');
}

function handleUseCurrentLocation() {
  // get user location from geolocation button
  $('#current-loc-btn').on('click touchstart' ,function (e) {
    getGeoLatLng();
    scrollToResults();
  });
}

function scrollToResults() {
  // scroll to results and remove old data from view
  $('.wrapper').removeClass('hidden');
  $('body').animate({
    scrollTop: $('.wrapper').offset().top
  }, 2000);
  $('#location, #result-cards').html('');
  state = {
    results: [],
    detailedResults: []
  }
  labelCount = 1;
}

var state = {
  results: [],
  detailedResults: []
}

var myMap;
var infowindow;
var labelCount = 1;
var pos;

function getGeoLatLng() {
  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      pos = {
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
    zoom: 13,
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

function reverseGeocode(pos) {
  //convert lat & long from geolocation to a string location
  var geocoder = new google.maps.Geocoder();
  var latlng = new google.maps.LatLng(pos.lat, pos.lng);

  geocoder.geocode({
    'latLng': latlng
  }, function (results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
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
    state.results.sort((a, b) => parseInt(a.label) - parseInt(b.label)); //sort results by lowest label count to highest
    createMarker();
  } else {
    renderNoResults();
  }
}

function renderNoResults() {
  //ALERT THE USER THAT NO RESULTS WERE FOUND
  $('#location').text('No roasters found in this location.');
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


  function detailsCallback(results, status) {
    //aggregate relevant details from .getDetails and store in global state.
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      var details = {
        name: results.name || null,
        addr: results.formatted_address ? results.formatted_address : null,
        open: results.opening_hours ? results.opening_hours.open_now : null,
        phone: results.international_phone_number ? results.international_phone_number : null,
        website: results.website || null,
        rating: results.rating ? results.rating : null,
        photos: results.photos ? results.photos : null,
        photoDimension: {
          'maxWidth': (results.photos && results.photos[0].width) ? results.photos[0].width : null,
          'maxHeight': (results.photos && results.photos[0].height) ? results.photos[0].height : null
        },
        label: state.detailedResults.length + 1,
        hours: results.opening_hours ? results.opening_hours.weekday_text : null,
        reviews: results.reviews ? results.reviews : null,
        imgUrls: [],
        lat: results.geometry.location.lat(),
        lng: results.geometry.location.lng()
      }
      state.detailedResults.push(details);

      //when loop is finished
      if (state.detailedResults.length == state.results.length) {
        renderResultCard();
      }

    } else if (status == google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
      console.error(status);
    }
  }
}

function handleGetPhotos(placeObj) {
  // get photo urls from places api using getUrl and add to object
  placeObj.photos.map(function (photo) {
    var imgUrl = photo.getUrl({
      'maxWidth': photo.width,
      'maxHeight': photo.height
    });
    placeObj.imgUrls.push(imgUrl);
  });
}

function renderArea(area) {
  $('.loading').addClass('hidden');
  $('#location').text('Coffee roasters in ' + area);
}

function renderResultCard() {
  //render place details into the DOM

  var resultCardHtml = (
    '<li>' +
    '<article class="result">' +
    '<img src="" alt="">' +
    '<div class="glace-wrapper">' +
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
    $res.find('.rating').text(element.rating == null ? 'No rating.' : 'Rating: ' + element.rating + '/5');
    $res.find('img').attr('src', element.photos ?
      element.photos[0].getUrl(element.photoDimension) :
      'https://images.unsplash.com/photo-1442411210769-b95c4632195e?dpr=2&auto=format&fit=crop&w=1199&h=799&q=80&cs=tinysrgb&crop=&bg=');

    $('#result-cards').append($res);
  });

  var fallbackCardHtml = (
    '<li>' +
    '<article class="result fallback">' +
    '<h3>Can\'t find what you\'re looking for?</h3>' +
    '<button id="btn-fallback">TRY ANOTHER SEARCH</button>' +
    '</article>' +
    '</li>'
  )

  var $fallback = $(fallbackCardHtml);

  $('#result-cards').append($fallback);
  $('#btn-fallback').on('click touchstart', function (e) {
    e.preventDefault();
    $('body').animate({
      scrollTop: $('#main-header').offset().top
    }, 2000);
    $('footer').addClass('hidden');
  });
}

function handleCardClick() {
  // get result index to reference its details in renderDetails
  $('#result-list').on('click touchstart', '.name', function (e) {
    e.preventDefault();
    var thisCardIndex = $(this).siblings('.label').text(); //get the label number of the card clicked on.
    resetDetails();
    handleGetPhotos(state.detailedResults[thisCardIndex - 1]);
    renderDetails(state.detailedResults[thisCardIndex - 1]);
    $('body').animate({
      scrollTop: $('#details').offset().top
    }, 2000);
  });
}

function renderDetails(thisObjDetails) {
  // appends object details bound to html templates to DOM and adds header background image
  var header = renderHeader(thisObjDetails);
  var contact = renderContact(thisObjDetails);
  var feedback = renderFeedback(thisObjDetails);

  $('#details').append(header, contact, feedback);
  $('#contact, #feedback').wrapAll('<div id="details-wrapper"></div>');

  $('.roaster-banner').css({
    'background-image': 'linear-gradient(to bottom,rgba(0, 0, 0, 0),rgba(0, 0, 0, 0.6)), url("' + thisObjDetails.imgUrls[0] + '")'
  });

  $('footer').removeClass('hidden');

}

function renderHeader(thisObjDetails) {
  // bind object details to header

  var googleMapsBaseUrl = 'http://maps.google.com/maps?daddr=';

  var headerHtml = (
    '<header class="roaster-banner">' +
    '<div class="banner-title">' +
    '<h1></h1>' +
    '<h3 id="address"></h3>' +
    '</div>' +
    '</header>'
  );

  var $header = $(headerHtml);

  $header.find('h1').text(thisObjDetails.name);
  $header.find('h3').html('<a href="' + googleMapsBaseUrl + thisObjDetails.lat + ',' + thisObjDetails.lng + '" target="_blank"><i class="fa fa-map-marker" aria-hidden="true"></i> ' + thisObjDetails.addr + '</a>');

  return $header
}

function renderContact(thisObjDetails) {
  // bind object details to contact section

  var hours = thisObjDetails.hours ? thisObjDetails.hours.map(dayHours => '<li>' + dayHours + '</li>') : null;

  var contactHtml = (
    '<section id="contact">' +
    '<h3>HOURS</h3>' +
    '<ol id="hours"></ol>' +
    '<h3>PHONE</h3>' +
    '<p id="phone"></p>' +
    '<h3>WEBSITE</h3>' +
    '<a id="website" target="_blank"></a>' +
    '</section>'
  );

  var $contact = $(contactHtml);

  $contact.find('#hours').html(hours ? hours : 'No hours available.');
  $contact.find('#phone').text(thisObjDetails.phone != null ? thisObjDetails.phone : 'No phone number available.');
  $contact.find('#website').attr('href', thisObjDetails.website).text(thisObjDetails.website);

  return $contact;
}

function renderFeedback(thisObjDetails) {
  // bind object details to feedback section
  var feedbackHtml = (
    '<section id="feedback">' +
    '<h3 id="rating"></h3>' +
    '<h2>REVIEWS</h2>' +
    '<ul></ul>' +
    '</section>'
  );

  var $feedback = $(feedbackHtml);

  $feedback.find('#rating').text(thisObjDetails.rating != null ?
    'AVERAGE RATING ' + thisObjDetails.rating + '/5' :
    'No rating for this roaster.')
  $feedback.find('ul').html(renderReviews(thisObjDetails));

  return $feedback;
}

function renderReviews(thisObjDetails) {
  // return review html back to renderFeedback() as an array
  var reviewList = [];

  if (thisObjDetails.reviews == null) {
    return reviewList;
  } else {
    thisObjDetails.reviews.map(function (review) {
      var reviewHtml = (
        '<li>' +
        '<article class="review">' +
        '<img src="" alt="">' +
        '<h4></h4>' +
        '<p id="rating"></p>' +
        '<p id="desc"></p>' +
        '</article>' +
        '</li>'
      );

      var $review = $(reviewHtml);

      $review.find('img').attr('src', review.profile_photo_url);
      $review.find('h4').html('<a href="' + review.author_url + '">' + review.author_name + '</a>');
      $review.find('#desc').text(review.text);
      $review.find('#rating').text(review.rating + '/5');
      reviewList.push($review);
    });
  }
  return reviewList;
}

function handleReturnToResults(){
  $('#return-to-results').on('click touchstart', function(e){
    e.preventDefault();
    $('body').animate({
      scrollTop: $('.wrapper').offset().top
    }, 2000);
  });
}

function testScreenSize(){
  // if mobile, hide map.
  if ($('#result-list').css('width') == '100%'){
    $('#map').hide();
  }
}

// TODO: hide map for mobile users behind a button press.