var _ = require('lodash')
var moment = require('moment')
var L = require('leaflet')
L.tileLayer.deepzoom = require('./leaflet-deepzoom')

class UI {
  constructor() {
    this.menuVisible = false
    this.searchVisible = false
    this.deepZoomVisible = false
    this.map = {}
    this.setup()
  }

  catNumCheck(cat) {
    if (isNaN(Number(cat))) {
      return cat
    } else {
      return Number(cat)
    }
  }

  setup() {
    // Objects of interest
    let menuButton = document.querySelector('#navbar-menu')
    let expanderContent = document.querySelectorAll('.expander-content')
    let triggers = document.querySelectorAll('.expander-trigger')
    let curtain = document.querySelector('.sliding-panel-fade-screen')
    let thumbnails = document.querySelectorAll('.cat-entry__grid__item')
    let detailCloseButton = document.querySelector('.cat-entry__details__close')

    // Run these functions once on setup
    this.citationDate()
    expanderContent.forEach(function(expander) {
      expander.classList.add('expander--hidden')
    })

    // Event Listeners: All pages
    curtain.onclick = () => this.menuToggle()
    document.onkeydown = (e) => this.keyboardControls(e)
    menuButton.onclick = () => this.menuToggle()

    // Only on catalogue pages
    if (detailCloseButton) {
      detailCloseButton.onclick = () => this.hideDetails()
    }
    if (triggers.length > 0) {
      triggers.forEach(trigger => {
        trigger.onclick = (e) => this.expandToggle(e)
      })
    }
    if (thumbnails.length > 0) {
      thumbnails.forEach(thumbnail => {
        thumbnail.onclick = (e) => this.showDetails(e)
      })
    }
  }

  citationDate() {
    let today = moment().format('D MMM. YYYY')
    let currentDate = document.querySelectorAll('.cite-current-date')
    currentDate.forEach(function(el) {
      el.innerHTML = ''
      el.textContent = today
    })
  }

  keyboardControls(e) {
    let prev = document.querySelector('#prev-link')
    let next = document.querySelector('#next-link')
    switch (e.key) {
      case 'Escape':
        if (this.menuVisible) { this.menuToggle() }
        if (this.deepZoomVisible) { this.hideDetails() }
        e.preventDefault()
        break
      case 'ArrowLeft':
        if (this.menuVisible) { this.menuToggle() }
        if (this.deepZoomVisible) { this.hideDetails() }
        if (prev) { prev.click() }
        e.preventDefault()
        break
      case 'ArrowRight':
        if (this.menuVisible) { this.menuToggle() }
        if (this.deepZoomVisible) { this.hideDetails() }
        if (next) { next.click() }
        e.preventDefault()
        break
    }
  }

  // TODO: Add CSS transitions to these elements to replace what JQ was doing
  expandToggle(e) {
    let el = e.currentTarget
    let targetSection = el.parentNode.querySelector('.expander-content')
    let hideClass = 'expander--hidden'

    if (targetSection.classList.contains(hideClass)) {
      targetSection.classList.remove(hideClass)
    } else {
      targetSection.classList.add(hideClass)
    }
  }

  menuToggle() {
    let sidebar = document.querySelector('.nav-sidebar')
    let curtain = document.querySelector('.sliding-panel-fade-screen')

    if (this.menuVisible) {
      sidebar.classList.remove('is-visible')
      curtain.classList.remove('is-visible')
    } else {
      sidebar.classList.add('is-visible')
      curtain.classList.add('is-visible')
    }

    this.menuVisible = !(this.menuVisible)
  }

  // DetailsToggle
  // -----------------------------------------------------------------------------
  // Adds/removes classes for the display of the detail view of selected image.
  // Relies on tiles being available at an external URL which is hard-coded below
  // in the "path" variable: in the future this should be moved out into some kind
  // of config file.
  //
  // This function also handles the setup and teardown of Leaflet deep-zoom
  // instances, though in the future this functionality should probably be moved
  // elsewhere.
  showDetails(e) {
    let cat = this.catNumCheck(e.target.dataset.cat)
    let path = 'https://s3-us-west-1.amazonaws.com/gettypubs-lamps/' + cat
    let platesURL = 'https://gettypubs.github.io/ancient-lamps/plates.json'
    let dataURL = 'https://gettypubs.github.io/ancient-lamps/catalogue.json'
    let detailImage = document.querySelector('.cat-entry__details__image')
    let detailData = document.querySelector('.cat-entry__details__data')
    let detailCloseButton = document.querySelector('.cat-entry__details__close')

    // toggle classes for display
    detailImage.classList.add('is-visible')
    detailData.classList.add('is-visible')
    detailCloseButton.classList.add('is-visible')
    document.querySelector('body').classList.add('noscroll')
    this.deepZoomVisible = true

    // Fetch plates data
    $.get(platesURL).done((data) => {
      let query = {cat: cat}
      var imageData = _.find(data, query)
      var faces = imageData.images
      var layers = {}

      if (imageData) {
        this.map = L.map('js-deepzoom', {
          maxZoom: 13,
          minZoom: 10
        }).setView([0, 0], 13)

        faces.forEach(function(face) {
          var faceName = face.face
          var facePath = path + '/' + faceName + '/'
          layers[faceName + ' view'] = L.tileLayer.deepzoom(facePath, {
            width: face.width,
            height: face.height,
            tolerance: 0.8
          })
        })

        L.control.layers(layers).addTo(this.map).setPosition('topright')
        this.map.addLayer(layers['top view'])
      }
    })

    // Fetch tombstone data and template
    let template = document.getElementById('entry-template')
    let container = document.getElementById('entry-template-container')
    let clone = document.importNode(template.content, true)

    $.get(dataURL).done((data) => {
      let query = {'cat_no': cat}
      let catData = _.find(data, query)
      console.log(catData)

      // populate template
      clone.getElementById('entry-cat-number').textContent = catData.cat_no
      clone.getElementById('entry-inv-number').textContent = catData.inv_no
      clone.getElementById('entry-dimensions').textContent = catData.dimensions
      clone.getElementById('entry-condition').textContent = catData.condition_and_fabric
      clone.getElementById('entry-type').textContent = catData.type
      clone.getElementById('entry-place').textContent = catData.place
      clone.getElementById('entry-description').textContent = catData.description
      clone.getElementById('entry-parallels').textContent = catData.parallels

      // Some sections do not appear for all entries
      if (catData.provenance) {
        clone.querySelector('.section.provenance').classList.remove('is-hidden')
        clone.getElementById('entry-provenance').textContent = catData.provenance
      }

      if (catData.iconography) {
        clone.querySelector('.section.iconography').classList.remove('is-hidden')
        clone.getElementById('entry-iconography').textContent = catData.iconography
      }

      if (catData.discussion) {
        clone.querySelector('.section.discussion').classList.remove('is-hidden')
        clone.getElementById('entry-discussion').textContent = catData.discussion
      }

      if (catData.bibliography) {
        clone.querySelector('.section.bibliography').classList.remove('is-hidden')
        clone.getElementById('entry-bibliography').textContent = catData.bibliography
      }

      // Append the new template
      container.appendChild(clone)
    })
  }

  hideDetails() {
    let detailImage = document.querySelector('.cat-entry__details__image')
    let detailData = document.querySelector('.cat-entry__details__data')
    let detailCloseButton = document.querySelector('.cat-entry__details__close')
    let container = document.getElementById('entry-template-container')

    // toggle classes for display
    detailImage.classList.remove('is-visible')
    detailData.classList.remove('is-visible')
    detailCloseButton.classList.remove('is-visible')
    document.querySelector('body').classList.remove('noscroll')
    this.deepZoomVisible = false

    // Remove the old template
    container.innerHTML = ''

    // Remove the old map instance
    this.map.remove()
  }
}

export default UI
