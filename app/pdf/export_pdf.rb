class ExportPdf 
  require 'rmagick'
  include Prawn::View

  def initialize(params)
    @project = params[:project]
    @configs = params[:configs]
    @project_img = params[:project_img]
    
    set_fonts
    header()
    location()

    @configs.length > 1 ? multi_config : single_config
    footer()
  end
  
  def set_fonts
    default_leading 5
    font_families.update(
      "Verdana" => {
        :bold => "vendor/assets/fonts/verdana_b.ttf",
        :italic => "vendor/assets/fonts/verdana_i.ttf",
        :normal  => "vendor/assets/fonts/verdana.ttf" })
    font "Verdana", :size => 10
  end
  
  def header
    img_logo = "vendor/assets/uni_logo.png"

    image img_logo, position: :right, scale: 0.235
    text_box "Отчет параметров СЭС по проекту: <br> #{@project.title.upcase}", size: 14.5, align: :left, inline_format: true, text_color: "374156"
    move_down(35)
  end

  def footer
    go_to_page(page_count)
    page_num()
    creation_date = Time.zone.now.strftime("%e.%m.%Y")
    text_box creation_date, at: [470,10], size: 9, style: :italic
  end

  def page_num
    text_box page_number.to_s, at: [270,10], size: 9
  end

  def location
    move_down(55)

    text "Широта: #{@project.total_params['location']['latlong'][0] || ''} Долгота: #{@project.total_params['location']['latlong'][1] || ''}", align: :left, size: 11
    move_down(5)
    text "Адрес: #{@project.total_params['location']['address'] || ''}", align: :left, size: 11

    move_down(20)

    image StringIO.open(@project_img.tempfile.read), position: :center, scale: 0.43
    move_down(10)
    text "Рис. 1 - Местоположение области", align: :center, style: :italic, size: 10
  end

  def single_config
    config = @configs[0][:config]
    pv_module = @configs[0][:pv_module]
    pv_image = @configs[0][:img].tempfile.read
    
    step_table = "vendor/assets/step_table.png"
    distance_table = "vendor/assets/distance_table.png"

    start_new_page
    page_num()
    move_down(35)
    image StringIO.open(pv_image), position: :center, scale: 0.43

    move_down(10)
    text "Рис. 2 - Конфигурация опорных конструкций на местности", align: :center, style: :italic, size: 10
    start_new_page
    text "Таблица параметров СЭС", style: :italic, size: 10, align: :right
    
    if config.total_params
      pvs_in_table = config.configuration['row_pv_in_table'].to_i * config.configuration['column_pv_in_table'].to_i
      total_tables = config.total_params['all_tables'].to_i
      total_pvs = total_tables * pvs_in_table
      power_unit = 'кВт'
      total_power = (pv_module.power * total_pvs) / 1000
      if total_power > 1000
        total_power = total_power / 1000
        power_unit = 'МВт'
      end
      all_square = "#{config.total_params['squares']['all_area']['meters']} м²/  #{config.total_params['squares']['all_area']['hectares']} га"
      pv_square = "#{config.total_params['squares']['pv_area']['meters']} м²/  #{config.total_params['squares']['pv_area']['hectares']} га"
    end

    data = [ 
      ["Название параметра", "#{config.title}"],
      [{:content => "Итоговые параметры", :colspan => 2}],
      ["Количесво столов, шт.", total_tables || ''],
      ["Количесво ФЭМ, шт.", total_pvs || ''],
      ["Площадь под ФЭМ, м²/га", pv_square || ''],
      ["Площадь участка, м²/га", all_square || ''],
      ["Мощность СЭС, #{power_unit}", total_power || ''],
      [{:content => "Параметры площадки", :colspan => 2}],
      ["Расстояние от границ участка до ограждения, м", config.configuration['distance_to_barrier']],
      ["Расстояние от ограждения до полезной площади, м", config.configuration['distance_to_pv_area']],
      [{:content => "Параметры опорной конструкции", :colspan => 2}],
      ["Название модуля", pv_module.model],
      ["Мощность модуля, Вт", pv_module.power],
      ["Отступ между модулями, см", config.configuration['offset_pv']],
      ["Количество рядов", config.configuration['row_pv_in_table']],
      ["Количество модулей в ряду", config.configuration['column_pv_in_table']],
      ["Ориентация", config.configuration['orientation'] == 'horizontal'? "Альбомная" : "Книжная" ],
      ["Тип стола", config.configuration['type_table'] == 'fix' ? 'Фикс' : 'Трекер'],
      ["Угол наклона стола", config.configuration['type_table'] == 'fix' ? config.configuration['angle_fix'] : '-' ],  
      [{:content => "Параметры размещения", :colspan => 2}],
      ["Шаг (b), м", {:content => config.configuration['height_offset_tables'], :rowspan => 2}],
      [{image: step_table, position: :center, fit: [125, 100]}],
      ["Расстояние между столами (a), см", {:content => config.configuration['width_offset_tables'] , :rowspan => 2}],
      [{image: distance_table, position: :center, fit: [175, 100]}],
      ["Выравнивание столов относительно границ площадки", 
        config.configuration['align_row_tables'] == 'center' ? 'Центр' :
        config.configuration['align_row_tables'] == 'left' ? 'Левая граница' : 'Правая граница'
      ],
      ["Угол поворота столов относительно азимута", config.configuration['angle_from_azimut']],
    ]

    table(data, position: :left, header: true, column_widths: [270, 270]) do
      cells.style borders: [], padding: 7, border_color: "025238", border_width: 0.5, valign: :center
      column(0).style borders: [:left, :right]
      column(1).style borders: [:left, :right], align: :center
      row(0).style background_color:"025238", text_color: "ffffff", font_style: :bold, borders: [:left, :right, :top], align: :center
      row([1, 7, 10, 19]).style background_color: "eeeff1", align: :center
      row(25).style borders: [:left, :right, :bottom]
    end

    page_num()

    start_new_page   
    outputter = config.total_params['svg']['img']
    outputter.slice!('style="display: none;"')
    w_svg = config.total_params['svg']['width']
    h_svg  = config.total_params['svg']['height']
    w_max = 540
    h_max = 650

    if w_svg > w_max
      svg outputter, position: :center, vposition: :center, width: w_max
    elsif h_svg > h_max
      svg outputter, position: :center, vposition: :center, height: h_max
    else
      svg outputter, position: :center, vposition: :center
    end

    move_down(10)
    text "Рис. 3 - Конфигурация опорной конструкции", align: :center, style: :italic, size: 10
  end

  def multi_config
    step_table = "vendor/assets/step_table.png"
    distance_table = "vendor/assets/distance_table.png"
    img_map = "vendor/assets/scrin_map.png"
    img_table = "vendor/assets/scrin_table.png"
    # start_new_page(size: size, layout: :portrait)

    count_config = @configs.length
    
    if count_config <= 5
      pages = []
      pages = gen_table(pages, count_config)
    else
      five_col = count_config / 5
      pages = Array.new(five_col, {column: 5, layout: :landscape})
      remain = count_config % 5
      pages = gen_table(pages, remain)
    end
    
    index_config = 0
    pages.each do |page|
      start_new_page(layout: page[:layout])
      text "Таблица сравнения конфигураций СЭС", style: :italic, size: 10, align: :right
      columns = page[:column]
      data = rows_titles(columns + 1)
      col_params = get_column_width_and_scale(columns)

      columns.times do |n|
        data = add_data_column(col_params[:scale], data, index_config)
        index_config += 1
      end
      
      table(data, position: :left, header: true, column_widths: col_params[:width]) do
        cells.style borders: [], padding: 7, border_color: "025238", border_width: 0.5, valign: :center
        column(0).style borders: [:left, :right]
        column((1..columns).to_a).style borders: [:left, :right], align: :center
        row(0).style background_color:"025238", text_color: "ffffff", font_style: :bold, borders: [:left, :right, :top], align: :center
        row([2, 8, 11, 20]).style background_color: "eeeff1", align: :center
        row(25).style borders: [:left, :right, :bottom]
      end
    end

    move_down(20)  
    text "* ", align: :left, size: 11
    image step_table, position: :left, scale: 0.15
    move_down(10)
    text "** ", align: :left, size: 11
    image distance_table, position: :left, scale: 0.15
  end

  def get_column_width_and_scale col
    if col == 1
      scale = 0.210
      w_data_col = 270
      width = [w_data_col, w_data_col]
    elsif col == 2
      scale = 0.163
      w_data_col = 210
      width = [120, w_data_col, w_data_col]
    elsif col == 3
      scale = 0.156
      w_data_col = 200
      width = [120, w_data_col, w_data_col, w_data_col]
    elsif col == 4
      scale = 0.116
      w_data_col = 150
      width = [120, w_data_col, w_data_col, w_data_col, w_data_col]
    elsif col == 5
      scale = 0.092
      w_data_col = 120
      width = [120, w_data_col, w_data_col, w_data_col, w_data_col, w_data_col]
    end
    {width: width, scale: scale}
  end

  def gen_table pages, count_config
    if count_config <= 2
      pages << {column: count_config, layout: :portrait}
    elsif (3..5).include?(count_config)
      pages << {column: count_config, layout: :landscape}
    end
  end

  def add_data_column scale, data, index_config
    config = @configs[index_config][:config]
    pv_module = @configs[index_config][:pv_module]
    pv_image = @configs[index_config][:img].tempfile.read
    
    img_table = "vendor/assets/scrin_table.png"
    if config.total_params
      pvs_in_table = config.configuration['row_pv_in_table'].to_i * config.configuration['column_pv_in_table'].to_i
      total_tables = config.total_params['all_tables'].to_i
      total_pvs = total_tables * pvs_in_table
      total_power = (pv_module.power * total_pvs) / 1000
      if total_power > 1000
        total_power = "#{total_power / 1000} МВт"
      else
        total_power = "#{total_power} кВт"
      end
      all_square = "#{config.total_params['squares']['all_area']['meters']} м² /  #{config.total_params['squares']['all_area']['hectares']} га"
      pv_square = "#{config.total_params['squares']['pv_area']['meters']} м² /  #{config.total_params['squares']['pv_area']['hectares']} га"
    end

    img_point_on_map = StringIO.open(pv_image)
    outputter = config.total_params['svg']['img']
    outputter.slice!('style="display: none;"')
    image_table = StringIO.open(get_png_from_svg(outputter))
    data[0] << "№#{index_config + 1}| #{config.title}"
    data[1] << {image: img_point_on_map, position: :center, scale: scale}
    data[3] << total_tables || ''
    data[4] << total_pvs || ''
    data[5] << pv_square || ''
    data[6] << all_square || ''
    data[7] << total_power || ''
    data[9] << config.configuration['distance_to_barrier']
    data[10] << config.configuration['distance_to_pv_area']
    data[12] << pv_module.model
    data[13] << pv_module.power
    data[14] << config.configuration['offset_pv']
    data[15] << config.configuration['row_pv_in_table']
    data[16] << config.configuration['column_pv_in_table']
    data[17] << (config.configuration['orientation'] == 'horizontal'? "Альбомная" : "Книжная" )
    data[18] << (config.configuration['type_table'] == 'fix' ? 'Фикс' : 'Трекер')
    data[19] << (config.configuration['type_table'] == 'fix' ? 
                    config.configuration['angle_fix'] : '-' )
    data[21] << config.configuration['height_offset_tables']
    data[22] << config.configuration['width_offset_tables']
    data[23] << (config.configuration['align_row_tables'] == 'center' ? 
                    'Центр' : config.configuration['align_row_tables'] == 'left' ? 
                    'Левая граница' : 'Правая граница')
    data[24] << config.configuration['angle_from_azimut']
    data[25] << { image: image_table, position: :center, fit: pvs_in_table > 2 ? [100, 200] : [50, 100]}
    data
  end

  def rows_titles columns
    data = []
    data << ["Параметр"]
    data << ["Конфигурация опорных конструкций на местности"]
    data << [{:content => "Итоговые параметры", :colspan => columns}]
    data << ["Количесво столов, шт."]
    data << ["Количесво ФЭМ, шт."]
    data << ["Площадь под ФЭМ"]
    data << ["Площадь участка"]
    data << ["Мощность СЭС"]
    data << [{:content => "Параметры площадки", :colspan => columns}]
    data << ["Расстояние от границ участка до ограждения, м"]
    data << ["Расстояние от ограждения до полезной площади, м"]
    data << [{:content => "Параметры опорной конструкции", :colspan => columns}]
    data << ["Название модуля"]
    data << ["Мощность модуля, Вт"]
    data << ["Отступ между модулями, см"]
    data << ["Количество рядов"]
    data << ["Количество модулей в ряду"]
    data << ["Ориентация"]
    data << ["Тип стола"]
    data << ["Угол наклона стола"]
    data << [{:content => "Параметры размещения", :colspan => columns}]
    data << ["Шаг*, м"]
    data << ["Расстояние между столами**, см"]
    data << ["Выравнивание столов относительно границ площадки"]
    data << ["Угол поворота столов относительно азимута"]
    data << ["Конфигурация опорной конструкции"]
  end

  def get_png_from_svg svg
    img_table = Magick::Image::from_blob(svg)
    img_table[0].format = 'png'
    image = img_table[0].to_blob
  end
end

