module ExportsHelper
  require 'csv'

  def self.to_csv data
    data
    CSV.generate(headers: false) do |csv|

      data.split(",").each do |point|
        csv << point
        # csv << "#{point['lat']},#{point['lat']},#{point['elevate']}"
      end
      # long: c[1], 
      # lat:  c[0],
      # elevate: elevation
      # lat = float(all_str[1]) * -100000 
      # long = float(all_str[2]) * 100000
      # alt = all_str[3]
      # csv.write(f"{lat},{long},{alt}\n")
    end
  end
end
