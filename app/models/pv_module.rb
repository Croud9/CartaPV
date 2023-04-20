class PvModule < ApplicationRecord

  def import_module(import_file)
    params_module = []
    File.foreach(import_file.path).with_index do |line, index| 
      result_line = line.strip.split('=')
      params_module << result_line if result_line.length > 1
      # print "#{result_line}" if result_line.length > 1
    end
    params_module
  end

end
