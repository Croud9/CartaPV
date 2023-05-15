class PvModule < ApplicationRecord

  def self.import(import_file)
    params_pv = PvModule.new
    begin
    File.open(import_file.path, "r:Windows-1252:UTF-8" ).each_with_index do |line, index| 
      print line
      split_line = line.strip.split('=')
      
      if split_line[0] == "Manufacturer"
        params_pv.manufacturer = split_line[1]
      elsif split_line[0] == "Model"
        params_pv.model = split_line[1]
      elsif split_line[0] == "Width"
        params_pv.width = split_line[1]
      elsif split_line[0] == "Height"
        params_pv.height = split_line[1]
      elsif split_line[0] == "PNom"
        params_pv.power = split_line[1]
      end
    end
    pv_module_find = PvModule.find_by(model: params_pv.model)
    pv_module_find ? nil : params_pv
    rescue
      'file_error'
    end
  end
end
