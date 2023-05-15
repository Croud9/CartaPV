class AddTablesProjectsAndAreaConfigs < ActiveRecord::Migration[7.0]
  def change
    create_table :projects do |t|
      t.string :title, null: false
      t.text :total_params

      t.timestamps
    end

    create_table :area_configs do |t|
      t.string :area_id, null: false
      t.json :configuration
      t.json :geojson_area
      t.references :project, foreign_key: true

      t.timestamps
    end
  end
end
