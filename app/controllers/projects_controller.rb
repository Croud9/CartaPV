class ProjectsController < ApplicationController
  before_action :set_module, only: %i[destroy update show]

  def index
    @projects = Project.all
  end

  def show
    @area_config = @project.area_configs
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

    # project = Project.new(title: params[:input_project_title])
    area_config = AreaConfig.new(title: "Дефолтная", configuration: default_area_params)
    project = area_config.build_project(title: params[:input_project_title])

    if project.save && area_config.save
      redirect_to projects_path, alert: "Проект успешно создан"
    else
      redirect_to projects_path, notice: "Проект не создан"
    end 
  end
  
  def update
    input_title = params[:input_project_title]
    if input_title == @project.title || input_title.length == 0
      flash.now[:notice] = 'Название не изменено'
    else
      @project.update_attribute(:title, input_title)
      redirect_to projects_path, notice: "Название проекта успешно изменено"
    end
  end

  def destroy
    if @project.destroy
      redirect_to projects_path, notice: "Проект успешно удален"
    else
      render plain: "Проект не удален"
    end
  end

  private

  def set_module
    @project = Project.find(params[:id])
  end
end
