-- -- Script adding saving relative analysis scores in DB

-- one time
CREATE TABLE `relative_analysis_history` (
  `date` varchar(45) NOT NULL,
  `symbol` varchar(15) NOT NULL,
  `vs_symbol` varchar(15) NOT NULL,
  `relative_score` float NOT NULL,
  PRIMARY KEY (`date`, `symbol`, `vs_symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `relative_analysis_history_temp` (
  `date` varchar(45) NOT NULL,
  `symbol` varchar(15) NOT NULL,
  `vs_symbol` varchar(15) NOT NULL,
  `relative_score` float NOT NULL,
  PRIMARY KEY (`date`, `symbol`, `vs_symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;


-- each time (from code)
REPLACE INTO relative_analysis_history
( `date`, `symbol`, `vs_symbol`, `relative_score`)
SELECT `date`, `symbol`, `vs_symbol`, `relative_score` 
FROM relative_analysis_history_temp;


-- degbug and support 
SELECT * FROM relative_analysis_history_temp;
SELECT * FROM relative_analysis_history;