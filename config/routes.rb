Rails.application.routes.draw do
  root "pv_maps#index"
  get "pv_maps", to: "pv_maps#index"
  get "get_config_params", to: "pv_maps#get_config_params"
  get "get_project_params", to: "pv_maps#get_project_params"
  get "get_configs_by_project", to: "pv_maps#get_configs_by_project"
  get "get_params_for_snapshots", to: "exports#get_params_for_snapshots"
  get "export_file_path", to: "exports#show"
  get "export", to: "exports#index"
  post "gen_csv_for_pvsyst", to: "exports#csv_for_pvsyst"
  post "update_files", to: "exports#update_files"
  post "update_draw_area", to: "pv_maps#update_draw_area"
  post "update_configuration", to: "pv_maps#update_configuration"
  post 'update_model/:id', to: "pv_modules#update_model", as: 'update_model'

  resources :pv_modules do
    collection do
      post :import                               
    end
  end

  resources :projects, :area_configs do
  end
end
