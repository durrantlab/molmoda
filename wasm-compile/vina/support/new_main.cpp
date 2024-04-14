int main(int argc, char *argv[])
{
	std::vector<std::string> receptors;
	std::vector<std::string> ligands;

	// Read receptors from file
	std::ifstream receptorFile("receptor_list.txt");
	if (receptorFile.is_open())
	{
		std::string line;
		while (std::getline(receptorFile, line))
		{
			receptors.push_back(line);
		}
		receptorFile.close();
	}
	else
	{
		std::cout << "Unable to open receptor_list.txt" << std::endl;
		throw std::runtime_error("Error message");
	}

	// Read ligands from file
	std::ifstream ligandFile("ligand_list.txt");
	if (ligandFile.is_open())
	{
		std::string line;
		while (std::getline(ligandFile, line))
		{
			ligands.push_back(line);
		}
		ligandFile.close();
	}
	else
	{
		std::cout << "Unable to open ligand_list.txt" << std::endl;
		throw std::runtime_error("Error message");
	}

	// Combinatorially generate new command line arguments
	int index = 0;
	for (const auto &receptor : receptors)
	{
		for (const auto &ligand : ligands)
		{
			std::vector<std::string> newArgv;

			// Add common arguments
			newArgv.push_back(argv[0]);
			for (int i = 1; i < argc; i++)
			{
				std::string arg = argv[i];
				if (arg != "--receptor" && arg != "--ligand")
				{
					newArgv.push_back(arg);
				}
			}

			// Add --receptor and --ligand arguments
			newArgv.push_back("--receptor");
			newArgv.push_back(receptor);
			newArgv.push_back("--ligand");
			newArgv.push_back(ligand);

			// Generate output filename with index
			std::string receptorBasename = get_filename(receptor);
			std::string ligandBasename = get_filename(ligand);
			std::string outName = std::to_string(index) + "--" + receptorBasename + "--" + ligandBasename + ".out";
			newArgv.push_back("--out");
			newArgv.push_back(outName);

			std::vector<char *> newArgvCStr;
			for (const auto &arg : newArgv)
			{
				newArgvCStr.push_back(const_cast<char *>(arg.c_str()));
			}
			newArgvCStr.push_back(nullptr);

			try
			{
				// Call the vina_main function
				vina_main(newArgvCStr.size() - 1, newArgvCStr.data());
			}
			catch (int status)
			{
				// Handle the integer exception thrown by std::exit
				// std::cout << "vina_main exited with status: " << status << std::endl;
				std::cout << "ERROR RUN: " << index << std::endl;
			}
			catch (const std::exception &e)
			{
				// Catch other standard exceptions
				// std::cout << "An exception occurred: " << e.what() << std::endl;
				std::cout << "ERROR RUN: " << index << std::endl;
			}
			catch (...)
			{
				// Catch any other unknown exceptions
				// std::cout << "An unknown exception occurred." << std::endl;
				std::cout << "ERROR RUN: " << index << std::endl;
			}

			// Print out the arguments
			// std::cout << "Arguments: ";
			// for (const auto &arg : newArgv)
			// {
			// 	std::cout << arg << " ";
			// }
			// std::cout << std::endl;

			// Verify that "--score_only" is not in arguments.
			if (std::find(newArgv.begin(), newArgv.end(), "--score_only") == newArgv.end())
			{
				// Check if the output file exists. If not, ERROR RUN.
				std::ifstream outFile(outName);
				if (!outFile.is_open())
				{
					std::cout << "ERROR RUN: " << index << std::endl;
				}
			} else {
				// score_only is in the arguements. Save to outName file (empty)
				// to trigger detection.
				std::ofstream outFile(outName);
				outFile.close();
			}

			index++;
		}
	}

	// exit(EXIT_SUCCESS);
	return 0;
}