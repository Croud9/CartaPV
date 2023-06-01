class ExportsController < ApplicationController
  def index
    @projects = Project.all.order(:title)
    @area_configs = AreaConfig.all
  end

  def show
    project = Project.find(params[:select_project_pdf])
    title_configs = []
    configs = []
    params[:select_config_pdf].each do |id|
      config = AreaConfig.find(id)
      title_configs << config.title
      pv_module = PvModule.find(config.configuration['module_id'])
      configs << {config: config, pv_module: pv_module}
    end
    
    respond_to do |format|
      format.pdf do
        pdf = ExportPdf.new(project: project, configs: configs)
        send_data pdf.render,
          filename: "Отчет #{project.title} (#{title_configs.to_sentence}).pdf",
          type: 'application/pdf',
          disposition: 'inline'
      end
    end
  end

  def get_params_for_snapshots
    configs = AreaConfig.find(params[:id])
    project_area = configs[0].project.draw_area
    out_params = {project_areas: project_area.present? ? JSON.parse(project_area) : project_area, configs: []}
    not_module = []
    configs.each do |config|
      not_module << config.title if config.configuration['module_id'].blank?
      out_params[:configs] << {id: config.id, title: config.title, configuration: config.configuration}
    end

    if not_module.blank?
      respond_to do |format|
        format.json { render json: out_params }
      end
    else
      flash.now[:error] = "Не выбран модуль в конфигурациях: #{not_module}"
      render turbo_stream: turbo_stream.replace("flash_notice", 
        partial: "layouts/flash", 
        locals: { flash: flash }
      )
    end
  end

  def update_files
    configs = params[:configs]
    images = params[:config_imgs]
    location = params[:location]

    puts "location: #{location}"
    configs.length.times do |i|
      config = JSON.parse(configs[i])
      db_config = AreaConfig.find(config['id'])
      @project = db_config.project
      image = images[i]
      input_total_params = config['total_params']

      db_config.pv_config_on_map.purge
      db_config.pv_config_on_map.attach(image)
      db_config.update_attribute(:total_params, input_total_params) unless input_total_params.blank?
    end
    @project.point_on_map.purge
    @project.point_on_map.attach(params[:project_img])
    @project.update_attribute(:total_params, {location: JSON.parse(location)}) unless location.blank?
  end
end


