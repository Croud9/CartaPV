class ExportController < ApplicationController
  def show
    respond_to do |format|
      # // some other formats like: format.html { render :show }

      format.pdf do
        pdf = ExportPdf.new
        send_data pdf.render,
          filename: "export.pdf",
          type: 'application/pdf',
          disposition: 'inline'
      end
    end
  end
end


