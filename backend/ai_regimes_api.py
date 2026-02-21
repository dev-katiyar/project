from flask import jsonify, Blueprint
import dbutil_ai

api_ai_regimes = Blueprint('api_ai_regimes', __name__)

@api_ai_regimes.route("/ai_regimes_timeline", methods=['GET'])
def get_ai_regimes_timeline():
    sql = """
        SELECT 
            reg.date, reg.regime, reg.confidence, portVal.benchmark_value
        FROM
        regime_classifications reg
            JOIN
        backtest_portfolio_values portVal ON reg.date = portVal.date and config_name = 'config1_instant_rebalancing';
    """
    data = dbutil_ai.getDataTableNoLimit(sql)
    return jsonify(data)


@api_ai_regimes.route("/ai_regimes_portfolios", methods=['GET'])
def get_ai_regimes_portfolios():
    sql = """
        SELECT 
            config_name AS id, display_name AS name
        FROM
            config_metrics;
    """
    data = dbutil_ai.getDataTableNoLimit(sql)
    return jsonify(data)


@api_ai_regimes.route("/ai_regimes_backtest_portfolio_txns", methods=['GET'])
def get_ai_regimes_backtest_portfolio_txns():
    sql = """
        select * from ai_regimes_backtest_portfolio_txns order by date asc;
    """
    data = dbutil_ai.getDataTableNoLimit(sql)
    return jsonify(data)


@api_ai_regimes.route("/ai_regimes_backtest_portfolio_values", methods=['GET'])
def get_ai_regimes_backtest_portfolio_values():
    sql = """
        SELECT 
            date,
            benchmark_value,
            MAX(CASE WHEN config_name = 'config1_instant_rebalancing' THEN strategy_value END) AS config1_instant_rebalancing,
            MAX(CASE WHEN config_name = 'config2_smoothing_30pct' THEN strategy_value END) AS config2_smoothing_30pct,
            MAX(CASE WHEN config_name = 'config3_smoothing_50pct' THEN strategy_value END) AS config3_smoothing_50pct,
            MAX(CASE WHEN config_name = 'config4_smoothing_70pct' THEN strategy_value END) AS config4_smoothing_70pct,
            MAX(CASE WHEN config_name = 'config6_confidence_60pct_smoothing_30pct' THEN strategy_value END) AS config6_confidence_60pct_smoothing_30pct
        FROM backtest_portfolio_values
        GROUP BY date, benchmark_value
        ORDER BY date;
    """
    data = dbutil_ai.getDataTableNoLimit(sql)
    return jsonify(data)



@api_ai_regimes.route('/ai_regimes_etf_clusters', methods=['GET'])
def get_cluster_summaries():
    """Get cluster summaries"""
    try:
        query = """
            SELECT cluster_id, cluster_name, etf_count, etf_list, description
            FROM etf_cluster_summaries
            ORDER BY cluster_id
        """

        results = dbutil_ai.getDataTableNoLimit(query)

        if not results:
            return jsonify({'error': 'No cluster summary data found'}), 404

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@api_ai_regimes.route('/ai_regime_allocations', methods=['GET'])
def get_regime_allocations():
    """Get allocation mappings for all regimes"""
    try:
        query = """
            SELECT
                regime,
                cluster_id,
                cluster_name,
                allocation_percentage,
                description
            FROM regime_allocations
            ORDER BY regime, allocation_percentage DESC
        """

        results = dbutil_ai.getDataTableNoLimit(query)

        if not results:
            return jsonify({'error': 'No allocation data found'}), 404

        # Group by regime
        regimes_data = {}
        for row in results:
            regime = row['regime']
            if regime not in regimes_data:
                regimes_data[regime] = []
            regimes_data[regime].append(row)

        return jsonify(regimes_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@api_ai_regimes.route('/ai_regime_performance_comparison', methods=['GET'])
def get_comparison():
    """Get comparison metrics for all configurations"""
    try:
        query = """
            SELECT
                config_name as config,
                display_name as name,
                total_return as totalReturn,
                annualized_return as annualizedReturn,
                sharpe_ratio as sharpe,
                volatility,
                max_drawdown as maxDrawdown,
                num_trades as trades
            FROM config_metrics
            ORDER BY total_return DESC
        """

        results = dbutil_ai.getDataTableNoLimit(query)

        if not results:
            return jsonify({'error': 'No metrics data found'}), 404

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500