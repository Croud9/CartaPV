// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import jquery from 'jquery'
window.$ = jquery
import "./map"
import "./style"
import "./svg-table"
import "./configs_load"
import "./export"