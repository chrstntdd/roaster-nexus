'use strict';

$(function() {
  handleUseCurrentLocation();
  handleCardClick();
  googleAutoComplete();
  handleReturnToResults();
  resetInput();
  testScreenSize();
  toggleMap();
  toggleList();
});

function resetInput() {
  $('#autocomplete').on('focus', function(e) {
    e.preventDefault();
    $(this).val('');
    showElement(false, 'footer');
  });
}

function googleAutoComplete() {
  // allow text input to autocomplete to cities
  var options = {
    types: ['(cities)'],
    componentRestrictions: {
      country: 'us',
    },
  };

  var input = document.getElementById('autocomplete');
  var myAutocomplete = new google.maps.places.Autocomplete(input, options);

  myAutocomplete.addListener('place_changed', function() {
    // get geolocation of autocompleted city
    var place = myAutocomplete.getPlace();
    pos = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    initMap(pos);
    resetDetails();
    showElement(true, '.loading');
    scrollToResults();
    renderArea(place.formatted_address);
  });
}

function showElement(boolean, element) {
  boolean ? $(element).removeClass('hidden') : $(element).addClass('hidden');
}

function resetDetails() {
  $('#details').html('');
}

function handleUseCurrentLocation() {
  // get user location from geolocation button
  $('#current-loc-btn').on('click  ', function(e) {
    showElement(true, '.loading');
    showElement(false, 'footer');
    resetDetails();
    getGeoLatLng();
    scrollToResults();
  });
}

function scrollToSection(pageLocation) {
  $('body, html').stop().animate(
    {
      scrollTop: $(pageLocation).offset().top,
    },
    2000
  );
}

function scrollToResults() {
  // scroll to results and remove old data from view
  $('.wrapper').removeClass('hidden');
  scrollToSection('.wrapper');
  $('#location, #result-cards').html('');
  state = {
    results: [],
    detailedResults: [],
  };
  labelCount = 1;
}

var state = {
  results: [],
};

var myMap;
var infowindow;
var labelCount = 1;
var pos;

function getGeoLatLng() {
  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        reverseGeocode(pos);
        initMap(pos);

        infowindow.setPosition(pos);
        infowindow.setContent('You are here.');
        myMap.setCenter(pos);
      },
      function() {
        // Browser supports Geolocation, but the service failed
        handleLocationError(true, infowindow, myMap.getCenter());
      }
    );
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infowindow, myMap.getCenter());
  }
}

function initMap(pos) {
  myMap = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: pos.lat,
      lng: pos.lng,
    },
    zoom: 13,
    streetViewControl: false,
    scrollwheel: false,
  });

  infowindow = new google.maps.InfoWindow({
    map: myMap,
  });
  getNearbySearch(pos);
}

function getNearbySearch(pos) {
  // call nearbySearch for local coffee shops
  var request = {
    location: pos,
    keyword: 'roaster',
    rankBy: google.maps.places.RankBy.DISTANCE,
  };

  var service = new google.maps.places.PlacesService(myMap);
  service.nearbySearch(request, callback);
}

function reverseGeocode(pos) {
  //convert lat & long from geolocation to a string location
  var geocoder = new google.maps.Geocoder();
  var latlng = new google.maps.LatLng(pos.lat, pos.lng);

  geocoder.geocode(
    {
      latLng: latlng,
    },
    function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        renderArea(results[1].address_components[0].short_name);
      } else {
        // alert the user that their location cannot be determined.
        console.error("Can't reverse geocode this location");
      }
    }
  );
}

function handleLocationError(browserHasGeolocation, infowindow, pos) {
  window.alert('Error: Geolocation service failed. Try entering your city.');
  infowindow.setPosition(pos);
  infowindow.setContent(
    browserHasGeolocation
      ? 'Error: The Geolocation service failed. Try entering in your city.'
      : "Error: Your browser doesn't support geolocation."
  );
}

function callback(results, status) {
  if (
    status === google.maps.places.PlacesServiceStatus.OK &&
    results.length > 0
  ) {
    var firstResLocation = {
      lat: results[0].geometry.location.lat(),
      lng: results[0].geometry.location.lng(),
    };
    myMap.setCenter(firstResLocation);
    _.map(results, element => state.results.push(element));
    createMarker();
  } else {
    renderNoResults();
  }
}

function renderNoResults() {
  //ALERT THE USER THAT NO RESULTS WERE FOUND
  showElement(false, '.loading');
  renderFallbackCard();
}

function createMarker() {
  _.map(state.results, element => {
    var placeLoc = {
      lat: element.geometry.location.lat(),
      lng: element.geometry.location.lng(),
    };
    var marker = new google.maps.Marker({
      position: placeLoc,
      label: labelCount.toString(),
      map: myMap,
    });
    element.label = marker.label;
    labelCount++;

    marker.setMap(myMap);

    google.maps.event.addListener(marker, 'click', function() {
      infowindow.setContent(element.name);
      infowindow.open(map, this);
    });
  });
  renderResultCard();
}

function getPlaceDetails(place_id) {
  // make the request to get more details about a selected roaster
  var request = {
    placeId: place_id,
  };
  var service = new google.maps.places.PlacesService(myMap);
  service.getDetails(request, detailsCallback);
}

function detailsCallback(results, status) {
  // aggregate relevant details from .getDetails and store in global state.
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    // de-structure the results object response
    let {
      name = null,
      formatted_address = null,
      opening_hours = null,
      international_phone_number = null,
      website = null,
      rating = null,
      photos = null,
      reviews = null,
      geometry = null,
    } = results;

    state.detailedResults = {
      name: name,
      addr: formatted_address,
      open: opening_hours ? opening_hours.open_now : null,
      phone: international_phone_number,
      tel: international_phone_number
        ? international_phone_number.replace(/[\D]/g, '')
        : null,
      website: website,
      rating: rating,
      photos: photos,
      photoDimension: {
        maxWidth: photos && photos[0].width ? photos[0].width : null,
        maxHeight: photos && photos[0].height ? photos[0].height : null,
      },
      hours: opening_hours ? opening_hours.weekday_text : null,
      reviews: reviews,
      imgUrls: [],
      lat: geometry.location.lat(),
      lng: geometry.location.lng(),
    };
  } else {
    console.error(status);
  }
  // once the details have been stored in the global state
  renderDetails(state.detailedResults);
}

function renderArea(area) {
  $('#location').text('Coffee roasters near ' + area);
  $('#btn-show-map').css({ visibility: 'visible' });
}

function renderResultCard() {
  //render place details into the DOM
  showElement(false, '.loading');

  var resultCardHtml =
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
    '</li>';

  _.map(state.results, element => {
    var $res = $(resultCardHtml);

    $res.find('.name').text(element.name);
    $res.find('.label').text(element.label);
    $res.find('.address').text(element.vicinity);
    element.opening_hours
      ? $res
          .find('.open-closed')
          .text(element.opening_hours.open_now ? 'Open now' : 'Closed')
      : $res.find('.open-closed').text('No hours available.');
    $res
      .find('.rating')
      .text(
        element.rating === null
          ? 'No rating.'
          : 'Rating: ' + element.rating + '/5'
      );
    $res
      .find('img')
      .attr(
        'src',
        element.photos
          ? getPhotoUrl(element.photos[0], 2)
          : 'http://bit.ly/2oNpyEE'
      );

    $('#result-cards').append($res);
  });
  renderFallbackCard();
}

function getPhotoUrl(placePhotoObject, resolution) {
  // return image url
  var photoDimension = {
    maxWidth: parseInt(placePhotoObject.width / resolution),
    maxHeight: parseInt(placePhotoObject.height / resolution),
  };
  return placePhotoObject.getUrl(photoDimension);
}

function renderFallbackCard() {
  var fallbackCardHtml =
    '<li>' +
    '<article class="result fallback">' +
    "<h3>Can't find what you're looking for?</h3>" +
    '<button id="btn-fallback">TRY ANOTHER SEARCH <i class="fa fa-search" aria-hidden="true"></i></button>' +
    '</article>' +
    '</li>';

  var $fallback = $(fallbackCardHtml);

  $('#result-cards').append($fallback);
  $('#btn-fallback').on('click  ', function(e) {
    e.preventDefault();
    scrollToSection('#main-header');
    showElement(false, 'footer');
  });
}

function handleCardClick() {
  // get result index to reference its details in renderDetails
  $('#result-list').on('click', '.name', function(e) {
    e.preventDefault();
    var thisCardIndex = $(this).siblings('.label').text() - 1;
    getPlaceDetails(state.results[thisCardIndex].place_id);
    resetDetails();
    scrollToSection('#details');
  });
}

function getAllImages(thisObjDetails) {
  // assign all images to the selected roaster
  if (thisObjDetails.photos) {
    thisObjDetails.imgUrls = _.map(thisObjDetails.photos, element =>
      getPhotoUrl(element, 1)
    );
  } else {
    thisObjDetails.imgUrls = null;
  }
}

function renderDetails(thisObjDetails) {
  // appends object details bound to html templates to DOM and adds header background image
  getAllImages(thisObjDetails);

  var header = renderHeader(thisObjDetails);
  var contact = renderContact(thisObjDetails);
  var feedback = renderFeedback(thisObjDetails);

  $('#details').append(header, contact, feedback);
  $('#contact, #feedback').wrapAll('<div id="details-wrapper"></div>');

  $('.roaster-banner').css({
    'background-image':
      'linear-gradient(to bottom,rgba(0, 0, 0, 0),rgba(0, 0, 0, 0.6)), url("' +
      thisObjDetails.imgUrls[0] +
      '")',
  });

  showElement(true, 'footer');
}

function renderHeader(thisObjDetails) {
  // bind object details to header

  const GOOGLEMAPSBASEURL = 'http://maps.google.com/maps?daddr=';

  var headerHtml =
    '<header class="roaster-banner">' +
    '<div class="banner-title">' +
    '<h1></h1>' +
    '<h3 id="address"></h3>' +
    '</div>' +
    '</header>';

  var $header = $(headerHtml);

  $header.find('h1').text(thisObjDetails.name);
  $header
    .find('h3')
    .html(
      '<a href="' +
        GOOGLEMAPSBASEURL +
        thisObjDetails.lat +
        ',' +
        thisObjDetails.lng +
        '" target="_blank"><i class="fa fa-map-marker" aria-hidden="true"></i> ' +
        thisObjDetails.addr +
        '</a>'
    );

  return $header;
}

function renderContact(thisObjDetails) {
  // bind object details to contact section

  var hours = thisObjDetails.hours
    ? _.map(thisObjDetails.hours, dayHours => '<li>' + dayHours + '</li>')
    : null;

  var contactHtml =
    '<section id="contact">' +
    '<h3>HOURS</h3>' +
    '<ol id="hours"></ol>' +
    '<h3>PHONE</h3>' +
    '<p id="phone"></>' +
    '<h3>WEBSITE</h3>' +
    '<a id="website" target="_blank"></a>' +
    '</section>';

  var $contact = $(contactHtml);

  $contact.find('#hours').html(hours ? hours : 'No hours available.');
  $contact
    .find('#website')
    .attr('href', thisObjDetails.website)
    .text(thisObjDetails.website);
  // if tel exists, set the phone number as an anchor, else set it as a regular p tag.
  thisObjDetails.tel != null
    ? $contact
        .find('#phone')
        .html(`<a href="tel:${thisObjDetails.tel}">${thisObjDetails.phone}</a>`)
    : $contact
        .find('#phone')
        .text(
          thisObjDetails.phone != null
            ? thisObjDetails.phone
            : 'No phone number available.'
        );

  return $contact;
}

function renderFeedback(thisObjDetails) {
  // bind object details to feedback section
  var feedbackHtml =
    '<section id="feedback">' +
    '<h3 id="rating"></h3>' +
    '<h2>REVIEWS</h2>' +
    '<ul></ul>' +
    '</section>';

  var $feedback = $(feedbackHtml);

  $feedback
    .find('#rating')
    .text(
      thisObjDetails.rating !== null
        ? 'AVERAGE RATING ' + thisObjDetails.rating + '/5'
        : 'No rating for this roaster.'
    );
  $feedback.find('ul').html(renderReviews(thisObjDetails));

  return $feedback;
}

function renderReviews(thisObjDetails) {
  // return review html back to renderFeedback() as an array
  var reviewList = [];

  if (thisObjDetails.reviews === null) {
    return '<p>No reviews available.</p>';
  } else {
    _.map(thisObjDetails.reviews, review => {
      var reviewHtml =
        '<li>' +
        '<article class="review">' +
        '<img src="" alt="">' +
        '<h4></h4>' +
        '<p id="rating"></p>' +
        '<p id="desc"></p>' +
        '</article>' +
        '</li>';

      var $review = $(reviewHtml);

      $review.find('img').attr('src', review.profile_photo_url);
      $review
        .find('h4')
        .html(
          '<a href="' + review.author_url + '">' + review.author_name + '</a>'
        );
      $review.find('#desc').text(review.text);
      $review.find('#rating').text(review.rating + '/5');
      reviewList.push($review);
    });
  }
  return reviewList;
}

function handleReturnToResults() {
  $('#return-to-results').on('click  ', function(e) {
    e.preventDefault();
    scrollToSection('.wrapper');
  });
}

function testScreenSize() {
  // if mobile, hide map.
  if ($('#result-list').css('width') === '100%') {
    $('#map').hide();
  }
}

function toggleMap() {
  $('#btn-show-map').on('click', function(e) {
    resetDetails();
    $('#map').show();
    $('#result-list').hide();
    showElement(false, 'footer');
    showElement(true, '#btn-show-list');
    let center = {
      lat: state.results[0].geometry.location.lat(),
      lng: state.results[0].geometry.location.lng(),
    };
    google.maps.event.trigger(myMap, 'resize');
    myMap.setCenter(center);
  });
}

function toggleList() {
  $('#btn-show-list').on('click', function(e) {
    showElement(false, '#btn-show-list');
    $('#map').hide();
    $('#result-list').show();
  });
}
