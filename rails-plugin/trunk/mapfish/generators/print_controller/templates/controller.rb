require 'print'

class <%= class_name %>Controller < ApplicationController
  include MapFish::Print::Controller

  def initialize
    @classPath = "vendor/plugins/mapfish/print/print-standalone.jar"
    @configFile = "config/print.yaml"
  end
end
