class DeleteColumnAndAddNewProjects < ActiveRecord::Migration[7.0]
  def change
    remove_column  :projects, :total_params
    add_column :projects, :total_params, :json
  end
end
