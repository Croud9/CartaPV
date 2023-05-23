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
      out_params[:configs] << {configuration: config.configuration}
    end
    respond_to do |format|
      format.json { render json: out_params }
    end
  end

  def update_files
    config = AreaConfig.find(params[:id])
    input_configuration = params[:param]
    input_geogejson = params[:geojsons]
    input_total_params = params[:total_params]

    # config.files.purge
    # config.files.attach(params[:files])
    # config.project.update_attribute(:total_params, JSON.parse(input_total_params)) unless input_total_params.blank?
    # config.update_attribute(:geojson_area, input_geogejson) unless input_geogejson.blank? 
    # config.update_attribute(:configuration, input_configuration) unless input_configuration.blank? 
  end
end


