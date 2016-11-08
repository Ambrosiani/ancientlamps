//= require vendor/leaflet
//= require vendor/leaflet-deepzoom

var moment = require('./vendor/moment.js')

// Use this to wrap selectors that contain : characters
function jq(myid) { return myid.replace(/(:|\.|\[|]|,)/g, '\\$1') }

function anchorScroll(href) {
  href = typeof (href) === 'string' ? href : $(this).attr('href')
  var fromTop = 60

  if (href.indexOf('#') === 0) {
    var $target = $(href)

    if ($target.length) {
      $('html, body').animate({ scrollTop: $target.offset().top - fromTop })
      if (window.history && 'pushState' in window.history) {
        window.history.pushState({}, document.title, window.location.pathname + href)
        return false
      }
    }
  }
}

// Get today's current date, using Moment JS
function citationDate() {
  var today = moment().format('D MMM. YYYY')
  $('.cite-current-date').empty()
  $('.cite-current-date').text(today)
}

function footnoteScroll() {
  $(".footnote, .reversefootnote, .section-link").click(function(event){

    var target = $(this).attr("href");
    var distance = $(jq(target)).offset().top;

    $("html, body").animate({
      scrollTop: distance - 60
    }, 250);

  });
}

function keyboardNav(){
  $(document).keydown(function(event) {
    var prev, next, photoswipeActive;
    prev = document.getElementById("prev-link");
    next = document.getElementById("next-link");

    // Make sure photoswipe is not active
    photoswipeActive = $(".pswp").hasClass("pswp--visible");
    if (!(photoswipeActive)) {
      // 37 = left arrow key
      if (event.which === 37 && prev) {
        prev.click();
        event.preventDefault();
      }
      // 39 = right arrow key
      else if (event.which === 39 && next) {
        next.click();
        event.preventDefault();
      }
    }
  });
}

function mapSetup() {
  if ($("#map").length) {
    // Get Catalogue data
    $.getJSON("<%= baseurl %>/catalogue.json", function(data){
      // Stash catalogue json data for later use
      window.CATALOGUE = data;
      // Instantiate map
      var centerPoint = $("#map").data("center");
      RegionMap = new GeoMap(centerPoint);
      if ($("#map").parent().hasClass("cover-map")) {
        RegionMap.map.setZoom(5);
      }
      if (window.location.hash.slice(1, 4) == "loc") {
        RegionMap.zoomToHash();
      }
      window.onhashchange = RegionMap.zoomToHash;
    }).fail(function() {
      console.log("Failed to load catalogue json");
    });
  }
}

function plateSetup() {
  if ($("#plate").length) {
    // Get zoom data
    $.getJSON("<%= baseurl %>/plates.json", function(data){
      // stash plates json data for later use
      window.PLATES = data;
      // Instantiate deepZoom
      var catNum   = $("#plate").data("cat");
      var zoomData = _.find(window.PLATES, function(entry) {
        // If catNum is an array, just pass zoom data of first value
        return entry.id == parseInt(catNum);
      });
      var plate = new DeepZoom(catNum, zoomData);
    }).fail(function() {
      console.log("Failed to load plates json");
    });
  }

}

function offCanvasNav() {
  var $sidebar = $(".nav-sidebar");
  var $menuButton = $("#navbar-menu");
  var $closeButton = $("#nav-menu-close");
  var $curtain = $(".sliding-panel-fade-screen");

  $menuButton.on("click", function() {
    $sidebar.toggleClass("is-visible");
    $curtain.toggleClass("is-visible");
    // Force css repaint to deal with webkit "losing" the menu contents
    // on mobile devices
    $('<style></style>').appendTo($(document.body)).remove();
  });

  $closeButton.on("click", function() {
    $sidebar.removeClass("is-visible");
    $curtain.removeClass("is-visible");
  });

  $curtain.on("click", function() {
    $sidebar.removeClass("is-visible");
    $curtain.removeClass("is-visible");
  });

  // bind escape key to menu close if menu is open
  $(document).keydown(function(event) {
    if (event.which === 27 && $sidebar.hasClass("is-visible")) {
      $sidebar.removeClass("is-visible");
      $curtain.removeClass("is-visible");
    }
  });
}

function expanderSetup() {
  var $expanderContent  = $(".expander-content");
  var $expanderTriggers = $(".expander-trigger");

  $($expanderContent).addClass("expander--hidden");

  $expanderTriggers.on("click", function() {
    var $target = $(this).parent().find(".expander-content");
    $target.slideToggle("fast", function() {
      $target.toggleClass("expander--hidden");
    });
  });
}

function searchSetup() {
  var $searchButton = $("#navbar-search");
  var $searchCloseButton = $("#search-close");
  var $navbar = $(".navbar");
  var $results = $(".search-results");

  $searchButton.on("click", function() {
    $navbar.toggleClass("search-active");
    $results.toggleClass("search-active");
  });

  $searchCloseButton.on("click touchstart", function() {
    $navbar.removeClass("search-active");
    $results.removeClass("search-active");
  });

  // bind escape key to search close if search is active
  $(document).keydown(function(event) {
    if (event.which === 27 && $navbar.hasClass("search-active")) {
      $navbar.removeClass("search-active");
      $results.removeClass("search-active");
    }
  });
}

function popupSetup() {
  var $popups = $(".popup");
  $popups.each(function(index) {

    var $popup = $(this);

    // Definition Popup--------------------------------------------------------
    // ------------------------------------------------------------------------
    if ($popup.data("definition")) {
      var $el = $("<div>", {class: "popup-content"});
      $el.html($popup.data("definition"));
      $popup.append($el);
      $popup.on("click", function() {
        $popup.find(".popup-content").toggleClass("visible");
      });

    // Location Popup ---------------------------------------------------------
    // ------------------------------------------------------------------------
    } else if ($popup.data("location")) {
      var mapLocation;
      // Look for location that corresponds to data-location ID
      mapLocation = _.find(geojsonFeature.features, function(loc) {
        return loc.properties.id == $popup.data("location");
      });

      if (mapLocation == undefined) {
        console.log("No location data for " + $popup.text());
        $popup.removeClass("popup popup-location");

      } else {
        var $el, map, coords, label, marker;
        $el = $("<div>", {class: "popup-content"});
        $popup.append($el);

        coords = L.latLng([ mapLocation.geometry.coordinates[1], mapLocation.geometry.coordinates[0]]);
        map    = new PopupMap(coords, $popup.find(".popup-content")[0]).map;
        marker = L.marker(coords).addTo(map);

        marker.bindPopup(mapLocation.properties.custom_name);
        $popup.on("click", function() {
          if (!$popup.find(".popup-content").hasClass("visible")) {
            map.setView(coords, 6);
            $popup.find(".popup-content").addClass("visible");
            window.setTimeout(function() { map.invalidateSize(); }, 300);
          }
        });
      }

    // Image Popup ------------------------------------------------------------
    // ------------------------------------------------------------------------
    } else if ($popup.data("pic")) {
      var picData = JSON.parse($popup.data("pic"));
      var $el     = $("<figure>", {class: "popup-content"});
      var $img    = $("<img>", {src: "<%= baseurl %>/assets/images/pics/" + picData.file });
      var $figcap = $("<figcaption>");

      $figcap.html(
        "<a href='" + picData.url + "' target='blank'>" +
        picData.title + "</a>. " +
        picData.source_credit
      );
      $el.append($img);
      $el.append($figcap);
      $popup.append($el);
      $popup.on("click", function() {
        $popup.find(".popup-content").toggleClass("visible");
      });
    }
  });
}

function lightBoxSetup() {
  if ($(".inline-figure")) {
    $figures = $(".inline-figure img");
    $figures.on("click", function(e) {
      var figs = document.querySelectorAll(".inline-figure");
      var target = _.findIndex(figs, function(figure) {
        return figure.id == e.target.parentNode.id;
      });

      console.log(target);
      lightBox(target);
    });

  }
}

// Check to see if the text selection contains popup-content nodes, remove them if so
// for reference see this: http://jsfiddle.net/m56af0je/8/
// and http://stackoverflow.com/questions/2026335/how-to-add-extra-info-to-copied-web-text
// and the Mozilla document.getSelection() docs
function cleanSelection() {
  var selection, popupDivs, popupText, newText;
  selection = document.getSelection();
  popupDivs = document.getElementsByClassName("popup-content");

  // Listen for copy event
  document.addEventListener('copy', function(event) {
    if (selection.toString().length > 0 && popupDivs.length > 0) {
      [].forEach.call(popupDivs, function(popup) {
        // Only modify selection if user's selection actually contains a popup
        if (selection.containsNode(popup)) {
          event.preventDefault();
          popupText = popup.innerText;
          newText   = selection.toString().replace(popupText, "");
          (event.clipboardData || window.clipboardData).setData("Text", newText);
        }
      });
    }
  });
}

function detailsToggle() {
  var $detailImage = $(".cat-entry__details__image");
  var $detailData = $(".cat-entry__details__data");
  var $detailCloseButton = $(".cat-entry__details__close");
  var map;

  // Set up the modal view
  $(".cat-entry__grid__item").click(function(){
    $detailImage.toggleClass("is-visible");
    $detailData.toggleClass("is-visible");
    $detailCloseButton.toggleClass("is-visible");
    // console.log($(this).data("cat"));
    // $(this) gives us the element that triggered the event
    var cat = $(this).data("cat");
    var path = "http://localhost:8000/tiles/" + cat + "/top/";
    // var path = "http://5a28ed66.ngrok.io/tiles/" + cat + "/top/";
    map = L.map("js-deepzoom", {
      maxZoom: 13,
      minZoom: 9
    }).setView([0, 0], 13);

    L.tileLayer.deepzoom(path, {
      width: 4662,
      height: 5000,
      tolerance: 0.8
    }).addTo(map);
  });

  // Tear down the modal view
  $detailCloseButton.click(function(){
    $detailImage.removeClass("is-visible");
    $detailData.removeClass("is-visible");
    $detailCloseButton.removeClass("is-visible");
    map.remove();
  });

  // Tear down the modal view on esc key
  $(document).keydown(function(event) {
    if (event.which === 27 && $detailImage.hasClass("is-visible")) {
      $detailImage.removeClass("is-visible");
      $detailData.removeClass("is-visible");
      $detailCloseButton.removeClass("is-visible");
      map.remove();
    }
  });
}

// Use this function as "export"
// Calls all other functions defined here inside of this one
module.exports = function() {
  keyboardNav()
  offCanvasNav()
  searchSetup()
  mapSetup()
  plateSetup()
  popupSetup()
  expanderSetup()
  lightBoxSetup()
  footnoteScroll()
  anchorScroll(window.location.hash)
  citationDate()
  cleanSelection()
  detailsToggle()
}