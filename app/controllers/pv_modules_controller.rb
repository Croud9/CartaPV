class PvModulesController < ApplicationController
  def index
    @pv_modules = PvModule.all
  end

  def import 
    params_module = PvModule.import(params[:file])
    if params_module == nil
      redirect_to pv_modules_path, alert: "Данный модуль уже существует"
    elsif params_module == 'file_error'
      redirect_to pv_modules_path, alert: "Ошибка в файле"
    else
      params_module.save!
      redirect_to pv_modules_path, notice: "Параметры модуля успешно добавлены"
    end 
  end
end
