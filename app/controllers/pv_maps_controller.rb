class PvMapsController < ApplicationController
  def index
    @pv_modules = PvModule.all.order(:model)
    @projects = Project.all
    @area_configs = AreaConfig.all
  end

  def find_configs
    @configs = AreaConfig.where(project_id: params[:id])
    respond_to do |format|
      format.js
    end
  end
end
