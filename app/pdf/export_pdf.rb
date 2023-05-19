class ExportPdf 
  include Prawn::View

  def initialize(params)
    @project = params[:project]
    @config = params[:config]
    @pv_module = params[:pv_module]
    
    set_fonts
    header()
    location()
    single_config
    # multi_config
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
    img_country = "vendor/assets/scrin_country.png"

    move_down(55)
    text "Адрес: ..............", align: :left, size: 11
    text "Координаты: .... ....", align: :left, size: 11
    move_down(20)
    image img_country, position: :center, scale: 0.45
    move_down(10)
    text "Рис. 1 - Местоположение области", align: :center, style: :italic, size: 10
  end

  def single_config
    img_map = "vendor/assets/scrin_map.png"
    img_table = "vendor/assets/scrin_table.png"
    step_table = "vendor/assets/step_table.png"
    distance_table = "vendor/assets/distance_table.png"

    start_new_page
    page_num()
    move_down(35)
    image img_map, position: :center, scale: 0.9
    move_down(10)
    text "Рис. 2 - Конфигурация опорных конструкций на местности", align: :center, style: :italic, size: 10
    start_new_page
    text "Таблица параметров СЭС", style: :italic, size: 10, align: :right
    pvs_in_table = @config.configuration['row_pv_in_table'].to_i * @config.configuration['column_pv_in_table'].to_i
    print @project.total_params
    print @project.total_params['all_tables']
    if @project.total_params
      total_pvs = @project.total_params['all_tables'].to_i * pvs_in_table
      total_power = @pv_module.power * count_pvs
    end

    data = [ 
      ["Название параметра", "Значение"],
      [{:content => "Итоговые параметры", :colspan => 2}],
      [],
      [],
      [],
      [],
      [],
      # ["Количесво столов, шт.", @project.total_params['all_tables']],
      # ["Количесво ФЭМ, шт.", total_pvs || ''],
      # ["Площадь под ФЭМ, м²/га", "#{@project.total_params['squares']['pv_area']['meters']} м²/  #{@project.total_params['squares']['pv_area']['hectares']} га"],
      # ["Площадь участка, ", "#{@project.total_params['squares']['all_area']['meters']} м²/  #{@project.total_params['squares']['all_area']['hectares']} га"],
      # ["Мощность СЭС, кВт или МВт", total_power || ''],
      [{:content => "Параметры площадки", :colspan => 2}],
      ["Расстояние от границ участка до ограждения, м", @config.configuration['distance_to_barrier']],
      ["Расстояние от ограждения до полезной площади, м", @config.configuration['distance_to_pv_area']],
      [{:content => "Параметры опорной конструкции", :colspan => 2}],
      ["Название модуля", @pv_module.model],
      ["Мощность модуля, Вт", @pv_module.power],
      ["Отступ между модулями, см", @config.configuration['offset_pv']],
      ["Количество рядов", @config.configuration['row_pv_in_table']],
      ["Количество модулей в ряду", @config.configuration['column_pv_in_table']],
      ["Ориентация", @config.configuration['orientation'] == 'horizontal'? "Альбомная" : "Книжная" ],
      ["Тип стола", @config.configuration['type_table'] == 'fix' ? 'Фикс' : 'Трекер'],
      ["Угол наклона стола", @config.configuration['type_table'] == 'fix' ? @config.configuration['angle_fix'] : '-' ],  
      [{:content => "Параметры размещения", :colspan => 2}],
      ["Шаг*, м", @config.configuration['height_offset_tables']],
      ["Расстояние между столами**, см", @config.configuration['width_offset_tables']],
      ["Выравнивание столов относительно границ площадки", 
        @config.configuration['align_row_tables'] == 'center' ? 'Центр' :
        @config.configuration['align_row_tables'] == 'left' ? 'Левая граница' : 'Правая граница'
      ],
      ["Угол поворота столов относительно азимута", @config.configuration['angle_from_azimut']],
    ]

    table(data, position: :left, header: true, column_widths: [270, 270]) do
      cells.style borders: [], padding: 7, border_color: "025238", border_width: 0.5
      column(0).style borders: [:left, :right]
      column(1).style borders: [:left, :right], align: :center
      row(0).style background_color:"025238", text_color: "ffffff", font_style: :bold, borders: [:left, :right, :top], align: :center
      row([1, 7, 10, 19]).style background_color: "eeeff1", align: :center
      row(23).style borders: [:left, :right, :bottom]
    end

    move_down(10)
    start_new_page   
    text "* ", align: :left, size: 11
    image step_table, position: :center, scale: 0.2
    text "** ", align: :left, size: 11
    image distance_table, position: :center, scale: 0.2

    page_num()

    start_new_page   
    move_down(35)
    image img_table, position: :center, scale: 0.5
    move_down(10)
    text "Рис. 3 - Конфигурация опорной конструкции", align: :center, style: :italic, size: 10
  end

  def multi_config
    img_map = "vendor/assets/scrin_map.png"
    img_table = "vendor/assets/scrin_table.png"

    start_new_page
    text "Таблица сравнения конфигураций СЭС", style: :italic, size: 10, align: :right
    data = [ 
      ["Параметр", "№1", "№2"],
      ["Конфигурация опорных конструкций на местности", {image: img_map, position: :center, fit: [150, 300]}, {image: img_map, position: :center, fit: [150, 300]}],
      [{:content => "Итоговые параметры", :colspan => 3}],
      ["Количесво столов, шт.", "", ""],
      ["Количесво ФЭМ, шт.", "", ""],
      ["Площадь под ФЭМ, га/м²", "", ""],
      ["Площадь участка, га/м²", "", ""],
      ["Мощность СЭС, кВ или МВт", ""],
      [{:content => "Параметры площадки", :colspan => 3}],
      ["Расстояние от границ участка до ограждения, м", "", ""],
      ["Расстояние от ограждения до полезной площади, м", "", ""],
      [{:content => "Параметры опорной конструкции", :colspan => 3}],
      ["Название модуля", "", ""],
      ["Мощность модуля, кВ или МВт", ""],
      ["Отступ между модулями, см", "", ""],
      ["Количество рядов", "", ""],
      ["Количество модулей в ряду", "", ""],
      ["Ориентация", "", ""],
      ["Тип стола", "", ""],
      [{:content => "Параметры размещения", :colspan => 3}],
      ["Шаг*, м", "", ""],
      ["Расстояние между столами**, см", "", ""],
      ["Выравнивание столов относительно границ площадки", "", ""],
      ["Угол поворота столов относительно азимута", "", ""],
      ["Конфигурация опорной конструкции", {image: img_table, position: :center, fit: [50, 100]}, {image: img_table, position: :center, fit: [50, 100]}],
    ]

    table(data, position: :left, header: true, column_widths: [150, 195, 195]) do
      cells.style borders: [], padding: 7, border_color: "025238", border_width: 0.5
      column(0).style borders: [:left, :right]
      column([1, 2]).style borders: [:left, :right], align: :center
      row(0).style background_color:"025238", text_color: "ffffff", font_style: :bold, borders: [:left, :right, :top], align: :center
      row([2, 8, 11, 19]).style background_color: "eeeff1", align: :center
      row(24).style borders: [:left, :right, :bottom]
    end
  end

  # def render()
  #   pdf = Prawn::Document.new
  #   table_data = Array.new
  #   table_data << ["Name","E-mail","Phone"]
  #   # @subs.each do |p|
  #   #   table_data << [p.name, p.email,p.phone]
  #   # end
  #   pdf.table(table_data, :width => 500, :cell_style => { inline_format: true })
  #   pdf.render
  # end
end

