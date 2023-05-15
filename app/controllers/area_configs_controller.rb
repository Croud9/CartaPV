class AreaConfigsController < ApplicationController
  before_action :set_config, only: %i[update destroy]

  def new
    @project = Project.find(params[:project_id])
  end

  def create 
    default_area_params = {
      distance_to_barrier: 20,
      distance_to_pv_area: 20,
      height_table: 1,
      width_table: 2,
      height_offset_tables: 10,
      width_offset_tables: 20,
      angle_from_azimut: 90,
      align_row_tables: 'center',
      type_table: 'tracker',
      orientation: 'vertical',
      angle_fix: 0,
      column_pv_in_table: 1,
      row_pv_in_table: 1,
    }
    project = Project.find(params[:project_id])
    area_config = project.area_configs.create(title: params[:input_config_title], configuration: default_area_params)

    redirect_to project_path(project), alert: "Конфигурация успешно создана"
  end

  def update
    input_title = params[:input_config_title]
    if input_title == @config.title || input_title.length == 0
      flash.now[:notice] = 'Название не изменено'
    else
      @config.update_attribute(:title, input_title)
      redirect_to project_path(@config.project), notice: "Название успешно изменено"
    end
  end

  def destroy
    if @config.destroy
      redirect_to project_path(@config.project), notice: "Конфигурация успешно удалена"
    else
      render plain: "Конфигурация не удалена"
    end
  end

  private

  def set_config
    @config = AreaConfig.find(params[:id])
  end
end
