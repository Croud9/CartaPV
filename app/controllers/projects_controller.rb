class ProjectsController < ApplicationController
  before_action :set_module, only: %i[destroy update show]

  def index
    @projects = Project.all
  end

  def show
    @area_config = @project.area_configs
  end

  def create 
    area_config = AreaConfig.new(title: "Дефолтная", configuration: DEFAULT_AREA_PARAMS)
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
