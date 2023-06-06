class PvModulesController < ApplicationController
  before_action :set_module, only: %i[destroy update_model]

  def index
    @pv_modules = PvModule.all.order(:manufacturer, :model)
  end

  def edit 
  end

  def destroy
    if @pv_module.destroy
      redirect_to pv_modules_path, notice: "Параметры модуля успешно удалены"
    else
      flash.now[:notice] = "Модуль не удален"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    end
  end

  def import 
    params_module = PvModule.import(params[:file])
    if params_module == nil
      flash.now[:success] = "Данный модуль уже существует"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    elsif params_module == 'file_error'
      flash.now[:error] = "Ошибка в файле"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    else
      params_module.save!
      redirect_to pv_modules_path, notice: "Параметры модуля успешно добавлены"
    end 
  end

  def update_model
    input_name = params[:input_pv_model]
    if input_name == @pv_module.model || input_name.length == 0
      flash.now[:success] = "Имя не изменено"
      render turbo_stream: turbo_stream.replace("flash_notice", partial: "layouts/flash", locals: { flash: flash })
    else
      @pv_module.update_attribute(:model, input_name)
      redirect_to pv_modules_path, notice: "Название модели успешно изменено"
    end
  end

  private

  def set_module
    @pv_module = PvModule.find(params[:id])
  end
end
