class PvMapsController < ApplicationController
  def index
    @pv_modules = PvModule.all.order(:model)
    @projects = Project.all
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
    respond_to do |format|
      format.js
      format.json { render json: @config.configuration }
    end
  end

  def set_configuration
    config = AreaConfig.find(params[:id])
    input_params = params[:param]

    flash.now[:notice] = "Save"
    # render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    respond_to do |format|
      format.js
    end
    
    # config.update_attribute(:configuration, input_params)

  end

end
