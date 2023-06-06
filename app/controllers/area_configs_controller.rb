class AreaConfigsController < ApplicationController
  before_action :set_config, only: %i[update destroy]

  def new
    @project = Project.find(params[:project_id])
  end

  def create 
    project = Project.find(params[:project_id])
    area_config = project.area_configs.create(title: params[:input_config_title], configuration: DEFAULT_AREA_PARAMS)

    redirect_to project_path(project), notice: "Конфигурация успешно создана"
  end

  def update
    input_title = params[:input_config_title]
    if input_title == @config.title || input_title.length == 0
      flash.now[:success] = "Название не изменено"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    else
      @config.update_attribute(:title, input_title)
      redirect_to project_path(@config.project), notice: "Название успешно изменено"
    end
  end

  def destroy
    if @config.destroy
      redirect_to project_path(@config.project), notice: "Конфигурация успешно удалена"
    else
      flash.now[:success] = "Конфигурация не удалена"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
      
    end
  end

  private

  def set_config
    @config = AreaConfig.find(params[:id])
  end
end
