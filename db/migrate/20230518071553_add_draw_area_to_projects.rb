class AddDrawAreaToProjects < ActiveRecord::Migration[7.0]
  def change
    add_column :projects, :draw_area, :json
  end
end
