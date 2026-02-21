from flask import Blueprint, jsonify
from dao import mongodb

api_ai_agents = Blueprint('api_ai_agents', __name__)

@api_ai_agents.route("/ai-agents/decisions/<symbol>", methods=['GET'])
def get_decision(symbol):
    print(f"Received request for symbol: {symbol}")
    decisions = {}
    try:
        filter = {"ticker": symbol}
        db_decisions = mongodb.get_data("ai_agents_ticker_decisions", filter)
        if db_decisions:
            decisions = db_decisions[0]["decisions"]
        else:
            print(f"No decisions found for symbol: {symbol}")
            decisions = {
                "symbol": symbol,
                "decisions": "No decisions found in DB"
            }
        return jsonify(decisions)
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({
            "error": "An error occurred while processing the request."
        }), 500
    

@api_ai_agents.route("/ai-agents/descriptions", methods=['GET'])
def get_agent_descriptions():
    print(f"Received request for symbol Agent Descrptioins")
    decisions = {}
    try:
        agent_descriptions = mongodb.get_data("ai_agents_descriptions", {})
        if not agent_descriptions:
            print(f"No Agent Descriptions found found for symbol")
        return jsonify(agent_descriptions[0])
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({
            "error": "An error occurred while processing the request."
        }), 500


@api_ai_agents.route("/ai-agents/summary", methods=['GET'])
def get_agent_descisions_summ():
    print(f"Summary Calculations...")
    try:
        groupings = [
            {"key": "combined_decision", "field" : "decisions.combined_decision.action"},
            {"key": "ben_graham_agent", "field" : "decisions.analyst_signals.ben_graham_agent.signal"},
            {"key": "bill_ackman_agent", "field" : "decisions.analyst_signals.bill_ackman_agent.signal"},
            {"key": "cathie_wood_agent", "field" : "decisions.analyst_signals.cathie_wood_agent.signal"},
            {"key": "charlie_munger_agent", "field" : "decisions.analyst_signals.charlie_munger_agent.signal"},
            {"key": "fundamentals_agent", "field" : "decisions.analyst_signals.fundamentals_agent.signal"},
            # {"key": "michael_burry_agent", "field" : "decisions.analyst_signals.michael_burry_agent.signal"},
            {"key": "peter_lynch_agent", "field" : "decisions.analyst_signals.peter_lynch_agent.signal"},
            {"key": "phil_fisher_agent", "field" : "decisions.analyst_signals.phil_fisher_agent.signal"},
            {"key": "sentiment_agent", "field" : "decisions.analyst_signals.sentiment_agent.signal"},
            {"key": "stanley_druckenmiller_agent", "field" : "decisions.analyst_signals.stanley_druckenmiller_agent.signal"},
            {"key": "technical_analyst_agent", "field" : "decisions.analyst_signals.technical_analyst_agent.signal"},
            {"key": "valuation_agent", "field" : "decisions.analyst_signals.valuation_agent.signal"},
            {"key": "warren_buffett_agent", "field" : "decisions.analyst_signals.warren_buffett_agent.signal"},
            {"key": "cliff_asness_agent", "field" : "decisions.analyst_signals.cliff_asness_agent.signal"},
            {"key": "howard_marks_agent", "field" : "decisions.analyst_signals.howard_marks_agent.signal"},
            {"key": "joel_greenblatt_agent", "field" : "decisions.analyst_signals.joel_greenblatt_agent.signal"},
            {"key": "john_bogle_agent", "field" : "decisions.analyst_signals.john_bogle_agent.signal"},
            {"key": "ray_dalio_agent", "field" : "decisions.analyst_signals.ray_dalio_agent.signal"},
            {"key": "seth_klarman_agent", "field" : "decisions.analyst_signals.seth_klarman_agent.signal"},
        ]
        res = mongodb.get_agggregated_summary("ai_agents_ticker_decisions", groupings)
        return jsonify(res)
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({
            "error": "An error occurred while processing the request."
        }), 500
    


@api_ai_agents.route("/ai-agents/agent-dec-symbols/<agent>/<signal>", methods=['GET'])
def get_agent_signal_symbols(agent, signal):
    print(f"Received request for agent: {agent} for signal: {signal}")
    if not agent or not signal:
        return jsonify({
            "error": "Bad Request"
        }), 400
    
    try:
        field = f"decisions.analyst_signals.{agent}"
    
        pipeline = [
            {
                "$match": {
                    field: {"$exists": True, "$ne": None},
                    f"{field}.signal": signal
                }
            },
            {
                "$project": {
                    "ticker": 1,
                    "signal": f"${field}.signal",
                    "confidence": f"${field}.confidence"
                }
            }
        ]

        if agent == 'combined_decision':
            field = f"decisions.{agent}"
            signal_map = {
                'bullish': ['buy'],
                'bearish': ['short', 'sell'],
                'neutral': ['hold']
            }

            signals = signal_map[signal]

            pipeline = [
            {
                "$match": {
                    field: {"$exists": True, "$ne": None},
                    f"{field}.action": {"$in": signals}
                }
            },
            {
                "$project": {
                    "ticker": 1,
                    "signal": f"${field}.action",
                    "confidence": f"${field}.confidence"
                }
            }
        ]
        
        res = mongodb.get_agggregated_pipline_list("ai_agents_ticker_decisions", pipeline)
        return jsonify(res)
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({
            "error": "An error occurred while processing the request."
        }), 500
