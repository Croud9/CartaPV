class PvModulesController < ApplicationController
  def index
  end

  def import 
    begin
      params_module = PvModule.import_module(params[:file])
      puts params_module
      redirect_to pv_modules_path
  
    rescue => exception 
      redirect_to pv_modules_path
    end
  end
end
