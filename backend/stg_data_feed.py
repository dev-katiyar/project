import historical_api


# [AK: 2022-02-07] Mostly useless file and funciton, but in future, this file can source data from elsewhere or
# do some basic cleaning and prep for strategies to be run more efficeintly. Like support for multiple symbols etc. 
def get_stg_input_df(symbol, start_date, end_date):
    return historical_api.getsymbol_data(symbol, start_date, end_date)
    