class ExportsController < ApplicationController
  
  def index
    @projects = Project.all.order(:title)
    @area_configs = AreaConfig.all
  end

  def get_params_for_snapshots
    configs = AreaConfig.find(params[:id])
    project = configs[0].project
    project_area = project.draw_area
    project_title = project.title
    if project_area.blank? 
      flash.now[:error] = "Не создана область проекта"
      render turbo_stream: turbo_stream.replace("flash_notice", 
        partial: "layouts/flash", 
        locals: { flash: flash }
      )
      return
    end

    out_params = {
      project_areas: JSON.parse(project_area), 
      project_title: project_title, 
      configs: []
    }

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
    configs_ajax = params[:configs]
    images = params[:config_imgs]
    location = params[:location]
    project_img = params[:project_img]
    config_ids = []
    title_configs = []
    configs = []

    configs_ajax.length.times do |i|
      config = JSON.parse(configs_ajax[i])
      db_config = AreaConfig.find(config['id'])
      config_ids << config['id']
      title_configs << db_config.title
      @project = db_config.project

      image = images[i]
      input_total_params = config['total_params']

      pv_module = PvModule.find(db_config.configuration['module_id'])
      
      db_config.pv_config_on_map.purge
      # db_config.pv_config_on_map.attach(image)
      db_config.update_attribute(:total_params, input_total_params) unless input_total_params.blank?
      configs << {config: db_config, pv_module: pv_module, img: image}
    end
    @project.point_on_map.purge
    @project.update_attribute(:total_params, {location: JSON.parse(location)}) unless location.blank?

    begin
      pdf_file = {
        file: ExportPdf.new(project: @project, configs: configs, project_img: project_img).render,
        name: "Отчет #{@project.title} (#{title_configs.to_sentence}).pdf",
      }
      set_pdf_file(pdf_file)
    rescue Exception => exception
      puts exception.message
      puts exception.backtrace.inspect
      flash.now[:error] = "Возникла ошибка при создании отчета #{exception.message}"
      render turbo_stream: turbo_stream.replace("flash_notice", 
        partial: "layouts/flash", 
        locals: { flash: flash }
      )
    end
  end
  
  def csv_for_pvsyst
    @@csv_data = ExportsHelper.to_csv(params)
  end

  def show
    respond_to do |format|
      format.pdf do
        pdf_file = get_pdf_file()
        send_data pdf_file[:file],
          filename: pdf_file[:name],
          type: 'application/pdf',
          disposition: 'inline'
      end
      format.csv do
        send_data @@csv_data[:data], 
        filename: "Relief by CartaPV peak(#{@@csv_data[:max_h]}m) #{Date.today}.csv",
        type: 'text/csv',
        disposition: 'attachment'
      end
    end
  end

  private 

  def set_pdf_file file 
    @@pdf_file = file
  end

  def get_pdf_file
    @@pdf_file
  end
end


