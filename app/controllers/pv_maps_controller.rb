class PvMapsController < ApplicationController
  def index
    @pv_modules = PvModule.all
  end
end
