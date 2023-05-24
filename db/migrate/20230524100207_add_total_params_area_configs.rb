class AddTotalParamsAreaConfigs < ActiveRecord::Migration[7.0]
  def change
    add_column :area_configs, :total_params, :json
  end
end
