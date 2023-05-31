class ProjectsController < ApplicationController
  before_action :set_project, only: %i[destroy update show]

  def index
    @projects = Project.all.order(:title)
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
      flash.now[:error] = "Проект не создан"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    end 
  end
  
  def update
    input_title = params[:input_project_title]
    if input_title == @project.title || input_title.length == 0
      flash.now[:error] = "Название не изменено"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    else
      @project.update_attribute(:title, input_title)
      redirect_to projects_path, notice: "Название проекта успешно изменено"
    end
  end

  def destroy
    if @project.destroy
      redirect_to projects_path, notice: "Проект успешно удален"
    else
      flash.now[:notice] = "Проект не удален"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    end
  end

  private

  def set_project
    @project = Project.find(params[:id])
  end
end
