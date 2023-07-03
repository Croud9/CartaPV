module ExportsHelper
  require 'csv'

  def self.to_csv params
    @data = JSON.parse(params[:pvsyst])
    distance = params[:distance_pt].to_i
    max_h = -1000
    width = get_width_box(0)
    height = get_height_box(0)
    scale_x = (distance / (width * 100000)).abs * -100000
    scale_y = (distance / (height * 100000)).abs * -100000
    file_csv = CSV.generate(headers: false) do |csv|
      @data.each do |point|
        max_h = point['elevate'] if point['elevate'] > max_h
        csv << [point['lat'] * scale_x , point['long'] * scale_y, point['elevate']]
      end
    end
    {data: file_csv, max_h: max_h.round(2)}
  end

  def self.get_height_box idx 
    points = @data.select{|point| point["lat"] == @data[idx]['lat'] && point["long"] != @data[idx]['long']}
    points.length == 0 ? get_height_box(idx + 1) : points[0]['long'] - @data[idx]['long']
  end

  def self.get_width_box idx
    points = @data.select{|point| point["long"] == @data[idx]['long'] && point["lat"] != @data[idx]['lat'] }
    points.length == 0 ? get_width_box(idx + 1) : points[0]['lat'] - @data[idx]['lat']
  end
end