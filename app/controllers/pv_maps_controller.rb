class PvMapsController < ApplicationController
  def index
    @pv_modules = PvModule.all.order(:model)
  end
end
