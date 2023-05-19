class ExportController < ApplicationController
  def show
    project = Project.find(params[:select_project_pdf])
    config = AreaConfig.find(params[:select_config_pdf][0])
    pv_module = PvModule.find(config.configuration['module_id'])

    respond_to do |format|
      # // some other formats like: format.html { render :show }
      format.pdf do
        pdf = ExportPdf.new(project: project, config: config, pv_module: pv_module )
        send_data pdf.render,
          filename: "export.pdf",
          type: 'application/pdf',
          disposition: 'inline'
      end
    end
  end
end


