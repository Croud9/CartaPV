class PvMapsController < ApplicationController
  def index
    @pv_modules = PvModule.all.order(:model)
    @projects = Project.all.order(:title)
    @area_configs = AreaConfig.all
  end

  def get_configs_by_project
    @configs = AreaConfig.where(project_id: params[:id])
    respond_to do |format|
      format.js
    end
  end
  
  def get_config_params
    @config = AreaConfig.find(params[:id])
    geo = @config.geojson_area
    respond_to do |format|
      format.js
      format.json { render json: {configuration: @config.configuration, geojson: geo.present? ? JSON.parse(geo) : geo} }
    end
  end

  def get_project_params
    project = Project.find(params[:id])
    respond_to do |format|
      format.json { render json: project.draw_area }
    end
  end

  def update_configuration
    config = AreaConfig.find(params[:id])
    input_configuration = params[:param]
    input_geogejson = params[:geojsons]
    input_total_params = params[:total_params]
    
    
    config.update_attribute(:total_params, JSON.parse(input_total_params)) unless input_total_params.blank?
    config.update_attribute(:geojson_area, input_geogejson) unless input_geogejson.blank? 
    config.update_attribute(:configuration, input_configuration) unless input_configuration.blank? 
    flash.now[:notice] = "Успешно сохранено"
    render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
  end

  def update_draw_area
    project = Project.find(params[:id])
    input_params = params[:options]
    print "adewwwww --> #{input_params}"
    project.update_attribute(:draw_area, input_params)
  end

end
