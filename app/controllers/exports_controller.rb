class ExportsController < ApplicationController
  def index
    @projects = Project.all.order(:title)
    @area_configs = AreaConfig.all
  end

  def show
    project = Project.find(params[:select_project_pdf])
    config = AreaConfig.find(params[:select_config_pdf][0])
    pv_module = PvModule.find(config.configuration['module_id'])

    respond_to do |format|
      format.pdf do
        pdf = ExportPdf.new(project: project, config: config, pv_module: pv_module )
        send_data pdf.render,
          filename: "export.pdf",
          type: 'application/pdf',
          disposition: 'inline'
      end
    end
  end

  def get_params_for_snapshots
    configs = AreaConfig.find(params[:id])
    project_area = configs[0].project.draw_area
    out_params = {project_areas: project_area.present? ? JSON.parse(project_area) : project_area, configs: []}

    configs.each do |config|
      out_params[:configs] << {id: config.id, configuration: config.configuration}
    end
    respond_to do |format|
      format.json { render json: out_params }
    end
  end

  def update_files
    configs = params[:configs]
    images = params[:config_imgs]
    configs.length.times do |i|
      config = JSON.parse(configs[i])
      db_config = AreaConfig.find(config['id'])
      @project = db_config.project
      image = images[i]
      input_total_params = config['total_params']

      db_config.pv_config_on_map.purge
      db_config.pv_config_on_map.attach(image)
      db_config.update_attribute(:total_params, input_total_params) unless input_total_params.blank?
      # db_config.table.purge
      # db_config.table.attach(params[:files])
    end
    @project.point_on_map.purge
    @project.point_on_map.attach(params[:project_img])
  end
end


