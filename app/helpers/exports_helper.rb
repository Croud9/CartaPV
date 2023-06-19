module ExportsHelper
  require 'csv'

  def self.to_csv params
    data = JSON.parse(params[:pvsyst])
    distance = params[:distance_pt].to_i
    first_pt = data[0]
    width = nil
    height = nil
    max_h = -1000
    (1..data.length).each do |i|
      break if height != nil && width != nil
      height = data[i]['long'] - first_pt['long'] if data[i]['lat'] == first_pt['lat'] && height == nil
      width = data[i]['lat'] - first_pt['lat'] if data[i]['long'] == first_pt['long'] && width == nil
    end
    scale_x = (distance / (width * 100000)).abs * -100000
    scale_y = (distance / (height * 100000)).abs * -100000
    file_csv = CSV.generate(headers: false) do |csv|
      data.each do |point|
        max_h = point['elevate'] if point['elevate'] > max_h
        csv << [point['lat'] * scale_x , point['long'] * scale_y, point['elevate']]
      end
    end
    {data: file_csv, max_h: max_h.round(2)}
  end
end