# Important Commands #
### Getting Started ###
* `git clone https://github.com/riapro/website-A11.git` - navigate to `local` folder
  (say projects) of choice and copy code from `github` remote repo
* `npm install` - installs needful from `package.json`
* `git checkout origin/main -b abhilash` - checkout a new branch directly from the 
  `github` remote repo
* `git checkout --track origin/priyanka-dev` - checkout a remote branch and `git status` 
  will inform if local and remote version diverge 
  
### Regular Working ###
* `git diff` - line level changes in the tracked files since last commit.
* `git diff --stat` - file level changes in the files (not new files) since last commit.
* `git status` - file level status of changed files (including new files) since last commit.
* `git add .`  - add all the files for next commit 
* `git add -u` - add all edited (not newly added) files for next commit 
* `git add <file or folder name>` - add specific file for next commit
* `git commit -m <commit note> -m <commit details>` - commits changes to current 
  `local` branch. Do it as often to track and understand incremental changes
* `git push origin abhilash` - push change of current `local` branch to `github` 
  remote branch
* `git pull` - fetches and merges most current code from the `github` remote repo. 
  * Pull if latest code can be merged with local without issue and change support current task.
  * By default, `git pull` pulls changes from the main branch. All `conflicts` are listed 
  in the console.
  * Look for the files are the red, these will have conflicts that we have to manually resolve.
* `git pull origin main` to pull changes from specific remote branch
  
### Tested Feature Merge ###
* Go to `github.com` to create pull request to merge changes from `your` remote 
  branch to `main` remote branch. Tag others to alert about the changes. Pull 
  recent merge to `local` machine as relevant
  

### Delete Local and Remote Commits ### 
* We can go back in time on local and remote branch. [Online Link](https://ncona.com/2011/07/how-to-delete-a-commit-in-git-local-and-remote/)
* `git pull origin abhilash` - to be in same state as remote `abhilash`
* `git rebase -i 26ff41318d4ca332929d5bdead81c7974a861c90` - to get to commit state we want
  * scary number is commit ID, can be found from `github` commits page
  * a `vim` editor opens for the edits. `:wq` - save and quit. `:qa!` to close the editor.
  * `git rebase --abort` - to abort the rebase process
* `git push origin +abhilash` - to delete the commits from the remote branch
  
### Others ###
* `git merge origin/main` ??
* Adding an already git tracked file to `.gitignore` will not be ignored. We have 
  to remove it `rm package-lock.json` then `git restore package-lock.json`.
  [Link](https://stackoverflow.com/questions/44600721/cant-make-git-stop-tracking-package-lock-json)

  